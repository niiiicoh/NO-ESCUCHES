import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, RotateCcw, Check, Coins } from 'lucide-react';
import { useAppStore } from '../features/game/store';
import { summary } from '../features/game/engine';
import { PlayerCard } from '../features/game/PlayerCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Empty, Field } from '../components/shared';
export function Play() {
  const store = useAppStore(),
    game = store.currentGame,
    [openedFinished] = useState(game?.status === 'FINISHED'),
    [player, setPlayer] = useState<string | null>(null),
    [price, setPrice] = useState(''),
    [feedback, setFeedback] = useState('');
  if (openedFinished) return <Navigate to="/game/results" replace />;
  if (!game)
    return (
      <Empty
        title="La mesa está vacía."
        description="Prepara una partida para empezar a asignar ítems."
      />
    );
  const current = game.items[game.currentItemIndex],
    s = player ? summary(game, player) : null,
    validPrice = price !== '' && Number.isSafeInteger(Number(price)) && Number(price) >= 0;
  const priceError =
    price !== '' && !validPrice
      ? 'Usa un precio entero no negativo.'
      : s && validPrice && Number(price) > s.balance
        ? `Le quedan $${s.balance}. El precio no puede superar ese saldo.`
        : '';
  const assigned = game.items.filter((i) => i.assignedPlayerId),
    auto = assigned.filter((i) => i.autoAssigned);
  async function assign() {
    if (!current || !player) return;
    const who = game!.players.find((p) => p.id === player)!.name;
    if (await store.assign(player, Number(price), current.id)) {
      setFeedback(`${current.name} → ${who} · $${price}`);
      setPlayer(null);
      setPrice('');
    }
  }
  async function undo() {
    if (await store.undo()) {
      setPlayer(null);
      setPrice('');
      setFeedback('Última decisión deshecha.');
    }
  }
  return (
    <div className="play-layout">
      <section className="play-main">
        <div className="play-header">
          <Link to="/" className="muted">
            {game.config.categoryName}
          </Link>
          <Button variant="ghost" disabled={!store.undoSnapshot || store.busy} onClick={undo}>
            <RotateCcw size={17} aria-hidden="true" />
            Deshacer
          </Button>
        </div>
        {game.status === 'FINISHED' ? (
          <div className="finished-card">
            <Check className="finish-icon" size={40} aria-hidden="true" />
            <p className="eyebrow">Todas las decisiones están tomadas</p>
            <h1>Partida terminada.</h1>
            {auto.length > 0 ? (
              <p>
                {game.players.find((p) => p.id !== auto[0].assignedPlayerId)?.name} llegó al límite.
                Los {auto.length} ítems restantes van a{' '}
                {game.players.find((p) => p.id === auto[0].assignedPlayerId)?.name} por $0.
              </p>
            ) : (
              <p>Todos los ítems tienen dueño. Es hora de revelar la mezcla.</p>
            )}
            <Button asChild>
              <Link to="/game/results">
                Ver resultados
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="current-card" key={current.id}>
              <div className="between">
                <span className="eyebrow">
                  Ítem {game.currentItemIndex + 1} de {game.config.totalItems}
                </span>
                <span className="card-mark" aria-hidden="true">
                  NE ↗
                </span>
              </div>
              <h1>{current.name}</h1>
              <p className="muted">¿Quién se lo lleva?</p>
              <div className="progress-track" aria-hidden="true">
                <span
                  style={{ width: `${(game.currentItemIndex / game.config.totalItems) * 100}%` }}
                />
              </div>
            </div>
            <div className="players-grid">
              {game.players.map((p, index) => (
                <PlayerCard
                  key={p.id}
                  game={game}
                  player={p}
                  index={index}
                  selected={player === p.id}
                  onSelect={() => setPlayer(p.id)}
                />
              ))}
            </div>
            <div className="price-panel panel">
              <h2>
                <Coins size={20} aria-hidden="true" />
                ¿Por cuánto?
              </h2>
              <div className="quick-prices" role="group" aria-label="Precios rápidos">
                {[0, 1, 2, 3, 4, 5, 10].map((p) => (
                  <Button
                    key={p}
                    variant="secondary"
                    aria-pressed={price === String(p)}
                    onClick={() => setPrice(String(p))}
                  >
                    ${p}
                  </Button>
                ))}
              </div>
              <Field
                label="Otro monto"
                hint="$0 también es una decisión válida."
                error={priceError}
              >
                {(id, desc) => (
                  <Input
                    id={id}
                    aria-describedby={desc}
                    aria-invalid={!!priceError}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Precio entero"
                  />
                )}
              </Field>
              <Button
                className="full assign-button"
                disabled={!player || !validPrice || !!priceError || store.busy}
                onClick={assign}
              >
                {player && validPrice
                  ? `Asignar a ${game.players.find((p) => p.id === player)?.name} por $${price}`
                  : 'Asignar ítem'}
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
              <p className="field-hint">
                {!player
                  ? 'Selecciona quién se lleva el ítem.'
                  : price === ''
                    ? 'Elige un precio para confirmar.'
                    : ''}
              </p>
            </div>
          </>
        )}
        <p className="feedback" role="status">
          {feedback}
        </p>
      </section>
      <aside className="history panel">
        <div className="between">
          <h2>Lo que pasó</h2>
          <span className="muted">{assigned.length} asignados</span>
        </div>
        {!assigned.length ? (
          <p className="muted">La primera decisión aún está por tomarse.</p>
        ) : (
          <ol>
            {assigned.map((i) => (
              <li key={i.id}>
                <span>{i.name}</span>
                <div className="muted">
                  → {game.players.find((p) => p.id === i.assignedPlayerId)?.name}{' '}
                  <strong>${i.price}</strong>
                  {i.autoAssigned && <span className="auto-label">Automático</span>}
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="history-note">La clasificación se revela al final.</p>
      </aside>
    </div>
  );
}
