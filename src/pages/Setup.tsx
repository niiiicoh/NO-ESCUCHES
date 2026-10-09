import { useMemo, useState, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { useMotion } from '../features/preferences/motion';
import { SoundToggle } from '../features/preferences/Controls';
import { audioService } from '../services/audio';
import { emitEffect } from '../services/events';
import { animateExit } from '../services/motion';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, X, ArrowRight } from 'lucide-react';
import type { Choice, Game, GameConfig, ItemType, SelectionMode } from '../types';
import { useAppStore } from '../features/game/store';
import {
  createGame,
  selectRandom,
  validateConfig,
  validateSetup,
  normalize,
} from '../features/game/engine';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useConfirm } from '../components/ui/confirm';
import { Composition, Field, PageHeading, Segmented, TypeTag } from '../components/shared';
const choiceFromGame = (g: Game) =>
  g.items.map((i) => ({
    id: i.sourceItemId ?? i.id,
    sourceItemId: i.sourceItemId,
    categoryId: i.categoryId,
    name: i.name,
    type: i.type,
  }));
export function SetupPage() {
  const motion = useMotion(),
    summaryRef = useRef<HTMLElement>(null),
    pendingFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (pendingFocus.current) {
      document.getElementById(pendingFocus.current)?.focus();
      pendingFocus.current = null;
    }
  });
  const store = useAppStore(),
    navigate = useNavigate(),
    location = useLocation(),
    [params] = useSearchParams(),
    confirm = useConfirm();
  const repeat = location.state?.repeat === true ? store.currentGame : null;
  const [names, setNames] = useState<[string, string]>(
    (repeat?.players.map((p) => p.name) as [string, string]) ?? ['Jugador 1', 'Jugador 2'],
  );
  const [money, setMoney] = useState(String(repeat?.config.startingMoney ?? 20)),
    [total, setTotal] = useState(String(repeat?.config.totalItems ?? 8)),
    [limit, setLimit] = useState(String(repeat?.config.maxItemsPerPlayer ?? 4)),
    [limitEdited, setLimitEdited] = useState(!!repeat);
  const [mode, setMode] = useState<SelectionMode>(repeat?.config.selectionMode ?? 'RANDOM');
  const [categoryId, setCategoryId] = useState(
    params.get('category') ??
      repeat?.config.categoryId ??
      store.catalog?.categories.find((c) => c.active)?.id ??
      '',
  );
  const [theme, setTheme] = useState(repeat?.config.categoryName ?? ''),
    [bad, setBad] = useState(String(repeat?.config.badCount ?? 4));
  const [selected, setSelected] = useState<string[]>(
    repeat?.config.selectionMode === 'MANUAL' ? choiceFromGame(repeat).map((i) => i.id) : [],
  );
  const [temporary, setTemporary] = useState<Choice[]>(
    repeat && repeat.config.selectionMode !== 'CUSTOM'
      ? choiceFromGame(repeat).filter((i) => !i.sourceItemId)
      : [],
  );
  const [custom, setCustom] = useState<Choice[]>(
    repeat?.config.selectionMode === 'CUSTOM' ? choiceFromGame(repeat) : [],
  );
  const [newName, setNewName] = useState(''),
    [newType, setNewType] = useState<ItemType>('GOOD'),
    [query, setQuery] = useState(''),
    [error, setError] = useState<string>(location.state?.repeatError ?? ''),
    [submitting, setSubmitting] = useState(false);
  const category = store.catalog?.categories.find((c) => c.id === categoryId && c.active);
  const pool = useMemo(
    () => [
      ...(store.catalog?.items
        .filter((i) => i.categoryId === categoryId && i.active)
        .map((i) => ({
          id: i.id,
          sourceItemId: i.id,
          categoryId: i.categoryId,
          name: i.name,
          type: i.type,
        })) ?? []),
      ...temporary,
    ],
    [store.catalog, categoryId, temporary],
  );
  const chosen = mode === 'CUSTOM' ? custom : pool.filter((i) => selected.includes(i.id));
  const config: GameConfig = {
    selectionMode: mode,
    categoryId: mode === 'CUSTOM' ? undefined : categoryId,
    categoryName: mode === 'CUSTOM' ? theme : (category?.name ?? ''),
    totalItems: Number(total),
    maxItemsPerPlayer: Number(limit),
    startingMoney: Number(money),
    badCount: mode === 'RANDOM' ? Number(bad) : chosen.filter((i) => i.type === 'BAD').length,
  };
  useLayoutEffect(() => {
    if (motion === 'none') return;
    const context = gsap.context(() => {
      gsap.fromTo(
        'dd,.composition',
        { opacity: 0.55 },
        { opacity: 1, duration: motion === 'reduced' ? 0.08 : 0.16, clearProps: 'all' },
      );
    }, summaryRef);
    return () => context.revert();
  }, [total, limit, bad, mode, categoryId, custom.length, selected.length, motion]);
  const numberErrors = validateConfig(config);
  const goodCount =
      mode === 'RANDOM'
        ? Number(total) - Number(bad)
        : chosen.filter((i) => i.type === 'GOOD').length,
    badCount = config.badCount;
  const incompleteSources =
    repeat?.config.selectionMode === 'MANUAL' &&
    repeat.items.some((i) => i.sourceItemId && !pool.some((p) => p.id === i.sourceItemId));
  function changeTotal(v: string) {
    setTotal(v);
    if (!limitEdited) setLimit(String(Math.ceil(Number(v) / 2)));
  }
  function addTemporary() {
    if (!newName.trim()) {
      setError('Escribe el nombre de la opción temporal.');
      return;
    }
    if (pool.some((i) => normalize(i.name) === normalize(newName))) {
      setError('Ya existe una opción con ese nombre en esta temática.');
      return;
    }
    const item = { id: crypto.randomUUID(), name: newName.trim(), type: newType };
    setTemporary([...temporary, item]);
    if (mode === 'MANUAL') setSelected([...selected, item.id]);
    setNewName('');
    setError('');
  }
  async function start() {
    if (submitting) return;
    setError('');
    setSubmitting(true);
    void audioService.unlock();
    try {
      if (numberErrors.length) throw new Error(numberErrors.join(' '));
      if (mode !== 'CUSTOM' && !category) throw new Error('Selecciona una categoría activa.');
      if (mode === 'MANUAL' && selected.some((id) => !pool.some((i) => i.id === id)))
        throw new Error('Una opción seleccionada ya no está disponible. Revisa la selección.');
      const choices =
        mode === 'RANDOM' ? selectRandom(pool, config.totalItems, config.badCount) : chosen;
      const s = { names, config, choices },
        errors = validateSetup(s);
      if (errors.length) throw new Error(errors.join(' '));
      if (
        store.currentGame?.status === 'PLAYING' &&
        !(await confirm(
          '¿Reemplazar la partida activa?',
          'La partida actual y su opción de deshacer se reemplazarán.',
          'Crear nueva partida',
        ))
      )
        return;
      if (await store.start(createGame(s))) navigate('/game/play');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la partida.');
      emitEffect('REJECT');
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <>
      <PageHeading
        title={repeat ? 'Otra vuelta. Mismas reglas.' : 'Prepara la mesa.'}
        description="Tú pones las reglas. Ellos ponen las excusas."
        back="/"
      />
      {incompleteSources && (
        <div className="notice">
          <p>
            Algunas opciones del catálogo cambiaron o están inactivas. Revisa la selección antes de
            repetir.
          </p>
          <Button
            variant="secondary"
            onClick={() => setSelected(selected.filter((id) => pool.some((i) => i.id === id)))}
          >
            Quitar selecciones no disponibles
          </Button>
        </div>
      )}
      <div className="setup-layout">
        <div className="setup-main">
          <section className="panel">
            <h2>Los jugadores</h2>
            <div className="two-columns">
              {names.map((n, index) => (
                <Field
                  key={index}
                  label={`Jugador ${index + 1}`}
                  error={!n.trim() ? 'Escribe un nombre.' : undefined}
                >
                  {(id, desc) => (
                    <Input
                      id={id}
                      aria-describedby={desc}
                      aria-invalid={!n.trim()}
                      value={n}
                      onChange={(e) =>
                        setNames(
                          index === 0 ? [e.target.value, names[1]] : [names[0], e.target.value],
                        )
                      }
                      required
                    />
                  )}
                </Field>
              ))}
            </div>
          </section>
          <section className="panel">
            <h2>Las reglas</h2>
            <div className="rules-grid">
              <Field
                label="Dinero por jugador"
                hint="Dinero ficticio."
                error={
                  !money || !Number.isSafeInteger(Number(money)) || Number(money) < 1
                    ? 'Usa un entero desde 1.'
                    : undefined
                }
              >
                {(id, desc) => (
                  <Input
                    id={id}
                    aria-describedby={desc}
                    type="number"
                    min="1"
                    step="1"
                    value={money}
                    onChange={(e) => setMoney(e.target.value)}
                  />
                )}
              </Field>
              <Field
                label="Total de ítems"
                error={
                  !total || !Number.isSafeInteger(Number(total)) || Number(total) < 2
                    ? 'Usa un entero desde 2.'
                    : undefined
                }
              >
                {(id, desc) => (
                  <Input
                    id={id}
                    aria-describedby={desc}
                    type="number"
                    min="2"
                    step="1"
                    value={total}
                    onChange={(e) => changeTotal(e.target.value)}
                  />
                )}
              </Field>
              <Field
                label="Límite por jugador"
                hint={`Entre ${Math.ceil(Number(total) / 2)} y ${total}.`}
                error={
                  Number(limit) < Math.ceil(Number(total) / 2) ||
                  Number(limit) > Number(total) ||
                  !limit ||
                  !Number.isSafeInteger(Number(limit))
                    ? `Se necesita un límite entre ${Math.ceil(Number(total) / 2)} y ${total}.`
                    : undefined
                }
              >
                {(id, desc) => (
                  <Input
                    id={id}
                    aria-describedby={desc}
                    type="number"
                    min={Math.ceil(Number(total) / 2)}
                    max={Number(total)}
                    step="1"
                    value={limit}
                    onChange={(e) => {
                      setLimitEdited(true);
                      setLimit(e.target.value);
                    }}
                  />
                )}
              </Field>
            </div>
            <p className="field-hint">
              Si alguien llega al límite, el resto va gratis al otro jugador.
            </p>
          </section>
          <section className="panel items-panel">
            <h2>Lo que está en juego</h2>
            <Segmented
              label="Origen de los ítems"
              value={mode === 'CUSTOM' ? 'CUSTOM' : 'CATALOG'}
              options={[
                { value: 'CATALOG', label: 'Categoría existente' },
                { value: 'CUSTOM', label: 'Personalizada' },
              ]}
              onChange={(v) => setMode(v === 'CUSTOM' ? 'CUSTOM' : 'RANDOM')}
            />
            {mode === 'CUSTOM' ? (
              <>
                <Field
                  label="Nombre de la temática"
                  error={!theme.trim() ? 'Escribe un nombre para tu temática.' : undefined}
                >
                  {(id, desc) => (
                    <Input
                      id={id}
                      aria-describedby={desc}
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="Por ejemplo: la peor mochila del mundo"
                    />
                  )}
                </Field>
                <p className="muted">
                  Cada fila entra en la partida. Esta temática no se añade al catálogo.
                </p>
                <div className="two-columns custom-lists">
                  {(['GOOD', 'BAD'] as const).map((type) => (
                    <div key={type}>
                      <h3 className={type === 'GOOD' ? 'good' : 'bad'}>
                        {type === 'GOOD' ? 'Buenos' : 'Malos'} ·{' '}
                        {custom.filter((i) => i.type === type).length}
                      </h3>
                      {custom
                        .filter((i) => i.type === type)
                        .map((i, index) => (
                          <div className="editable-row" key={i.id}>
                            <label className="sr-only" htmlFor={i.id}>
                              {type === 'GOOD' ? 'Bueno' : 'Malo'} {index + 1}
                            </label>
                            <Input
                              id={i.id}
                              value={i.name}
                              onChange={(e) =>
                                setCustom(
                                  custom.map((x) =>
                                    x.id === i.id ? { ...x, name: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                            <Button
                              variant="ghost"
                              aria-label={`Eliminar fila ${index + 1} de ${type === 'GOOD' ? 'buenos' : 'malos'}`}
                              onClick={(e) => {
                                animateExit(
                                  e.currentTarget.closest<HTMLElement>('.editable-row'),
                                  motion,
                                );
                                const rest = custom.filter((x) => x.id !== i.id);
                                pendingFocus.current =
                                  rest.find((x) => x.type === type)?.id ?? `add-custom-${type}`;
                                setCustom(rest);
                              }}
                            >
                              <X size={18} aria-hidden="true" />
                            </Button>
                          </div>
                        ))}
                      <Button
                        id={`add-custom-${type}`}
                        variant="secondary"
                        onClick={() => {
                          const id = crypto.randomUUID();
                          pendingFocus.current = id;
                          setCustom([...custom, { id, name: '', type }]);
                        }}
                      >
                        <Plus size={16} aria-hidden="true" />
                        Añadir {type === 'GOOD' ? 'bueno' : 'malo'}
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Field label="Temática">
                  {(id) => (
                    <select
                      id={id}
                      value={categoryId}
                      onChange={(e) => {
                        setCategoryId(e.target.value);
                        setSelected([]);
                        setTemporary([]);
                      }}
                    >
                      <option value="">Elige una categoría</option>
                      {store.catalog?.categories
                        .filter((c) => c.active)
                        .map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.emoji} {c.name}
                          </option>
                        ))}
                    </select>
                  )}
                </Field>
                <p className="field-hint">
                  Disponibles:{' '}
                  <Composition
                    good={pool.filter((i) => i.type === 'GOOD').length}
                    bad={pool.filter((i) => i.type === 'BAD').length}
                  />
                </p>
                <Segmented
                  label="Método de selección"
                  value={mode}
                  options={[
                    { value: 'RANDOM', label: 'Aleatoria' },
                    { value: 'MANUAL', label: 'Manual exacta' },
                  ]}
                  onChange={setMode}
                />
                {mode === 'RANDOM' ? (
                  <div className="composition-control">
                    <div className="between">
                      <h3>¿Cuántos malos?</h3>
                      <Composition good={goodCount} bad={badCount} />
                    </div>
                    <div className="slider-row">
                      <label className="sr-only" htmlFor="bad-slider">
                        Cantidad de malos
                      </label>
                      <input
                        id="bad-slider"
                        type="range"
                        min="0"
                        max={
                          Number.isSafeInteger(Number(total)) && Number(total) >= 2
                            ? Number(total)
                            : 2
                        }
                        value={bad}
                        onChange={(e) => setBad(e.target.value)}
                      />
                      <Field label="Malos">
                        {(id) => (
                          <Input
                            id={id}
                            type="number"
                            min="0"
                            max={total}
                            step="1"
                            value={bad}
                            onChange={(e) => setBad(e.target.value)}
                          />
                        )}
                      </Field>
                    </div>
                    {(['GOOD', 'BAD'] as const).map((type) => {
                      const need = type === 'GOOD' ? goodCount : badCount,
                        available = pool.filter((i) => i.type === type).length;
                      return need > available ? (
                        <p className="error-text" key={type}>
                          Necesitas {need} {type === 'GOOD' ? 'buenos' : 'malos'}; hay {available}.
                          Añade {need - available} o cambia la composición.
                        </p>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <>
                    <div className="between">
                      <strong>
                        {chosen.length} de {total} seleccionados
                      </strong>
                      <Composition good={goodCount} bad={badCount} />
                    </div>
                    <Field label="Buscar ítems">
                      {(id) => (
                        <Input id={id} value={query} onChange={(e) => setQuery(e.target.value)} />
                      )}
                    </Field>
                    <div className="selection-list">
                      {pool
                        .filter((i) =>
                          i.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
                        )
                        .map((i) => (
                          <label
                            className={`selection-option ${selected.includes(i.id) ? 'is-selected' : ''}`}
                            key={i.id}
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(i.id)}
                              onChange={(e) =>
                                setSelected(
                                  e.target.checked
                                    ? [...selected, i.id]
                                    : selected.filter((x) => x !== i.id),
                                )
                              }
                            />
                            <span>
                              {i.name}
                              {!i.sourceItemId && (
                                <small className="muted"> · Solo esta partida</small>
                              )}
                            </span>
                            <TypeTag type={i.type} />
                          </label>
                        ))}
                    </div>
                  </>
                )}
                <details className="temporary">
                  <summary>Añadir una opción solo para esta partida</summary>
                  <div className="temporary-form">
                    <Field label="Nombre de la opción">
                      {(id) => (
                        <Input
                          id={id}
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                        />
                      )}
                    </Field>
                    <Field label="Tipo">
                      {(id) => (
                        <select
                          id={id}
                          value={newType}
                          onChange={(e) => setNewType(e.target.value as ItemType)}
                        >
                          <option value="GOOD">Bueno</option>
                          <option value="BAD">Malo</option>
                        </select>
                      )}
                    </Field>
                    <Button variant="secondary" onClick={addTemporary}>
                      <Plus size={16} aria-hidden="true" />
                      Añadir
                    </Button>
                  </div>
                  {temporary.map((i) => (
                    <div className="list-row" key={i.id}>
                      <span>{i.name}</span>
                      <TypeTag type={i.type} />
                      <Button
                        variant="ghost"
                        aria-label={`Eliminar opción temporal ${i.name}`}
                        onClick={() => {
                          setTemporary(temporary.filter((x) => x.id !== i.id));
                          setSelected(selected.filter((x) => x !== i.id));
                        }}
                      >
                        <X size={16} aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </details>
              </>
            )}
          </section>
        </div>
        <aside className="setup-summary panel" ref={summaryRef}>
          <span className="eyebrow">La partida</span>
          <h2>{config.categoryName || 'Tu próxima temática'}</h2>
          <dl>
            <div>
              <dt>Jugadores</dt>
              <dd>2</dd>
            </div>
            <div>
              <dt>Dinero inicial</dt>
              <dd>${money} c/u</dd>
            </div>
            <div>
              <dt>Ítems en la mesa</dt>
              <dd>{total}</dd>
            </div>
            <div>
              <dt>Límite por persona</dt>
              <dd>{limit}</dd>
            </div>
          </dl>
          <Composition good={goodCount} bad={badCount} />
          {mode !== 'RANDOM' && (
            <p className="field-hint">
              {chosen.length} de {total} ítems ·{' '}
              {custom.some((i) => !i.name.trim()) && mode === 'CUSTOM' ? 'Hay filas vacías.' : ''}
            </p>
          )}
          <div className="setup-sound">
            <SoundToggle text />
            <p className="field-hint">Efectos opcionales, apagados inicialmente.</p>
          </div>
          <p className="muted small">
            Los tipos se ocultan durante la partida. El suspenso corre por tu cuenta.
          </p>
          <div aria-live="polite">{error && <p className="notice error-notice">{error}</p>}</div>
          <Button
            className="full"
            disabled={
              submitting ||
              store.busy ||
              !!store.errors.game ||
              !!store.errors.catalog ||
              !money ||
              !total ||
              !limit ||
              (mode === 'RANDOM' && !bad)
            }
            onClick={start}
          >
            Comenzar partida <ArrowRight size={18} aria-hidden="true" />
          </Button>
          <p className="field-hint">Revisa las reglas y la selección antes de comenzar.</p>
        </aside>
      </div>
    </>
  );
}
