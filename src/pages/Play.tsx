import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { OpeningWheel } from '../features/game/OpeningWheel';
import { useMotion, motionDurations } from '../features/preferences/motion';
import { animateExit, clearExits } from '../services/motion';
import { audioService } from '../services/audio';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, RotateCcw, Check, Coins } from 'lucide-react';
import { useAppStore } from '../features/game/store';
import { summary } from '../features/game/engine';
import { PlayerCard } from '../features/game/PlayerCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Empty, Field } from '../components/shared';
export function Play() {
  const motion = useMotion(),
    navigate = useNavigate(),
    cardRef = useRef<HTMLDivElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    [transitioning, setTransitioning] = useState(false),
    [pulse, setPulse] = useState(0),
    [reversing, setReversing] = useState(false);
  useEffect(() => {
    const release = () => {
      if (timer.current) clearTimeout(timer.current);
      setTransitioning(false);
      clearExits();
      if (document.hidden) audioService.stop();
    };
    document.addEventListener('visibilitychange', release);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      audioService.stop();
      clearExits();
      document.removeEventListener('visibilitychange', release);
    };
  }, []);
  useEffect(() => {
    if (motion !== 'full') {
      if (timer.current) clearTimeout(timer.current);
      setTransitioning(false);
      clearExits();
    }
  }, [motion]);
  const store = useAppStore(),
    game = store.currentGame,
    [openedFinished] = useState(game?.status === 'FINISHED'),
    [player, setPlayer] = useState<string | null>(null),
    [price, setPrice] = useState('1'),
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
    validPrice = price !== '' && Number.isSafeInteger(Number(price)) && Number(price) >= 1;
  const priceError =
    price !== '' && !validPrice
      ? Number(price) === 0
        ? 'La apuesta mínima es $1.'
        : 'Ingresa un monto entero desde $1.'
      : s && s.balance < 1
        ? 'Este jugador no tiene saldo para una compra.'
        : s && validPrice && Number(price) > s.balance
          ? `Le quedan $${s.balance}. El precio no puede superar ese saldo.`
          : '';
  const assigned = game.items.filter((i) => i.assignedPlayerId),
    auto = assigned.filter((i) => i.autoAssigned);
  const noBalance =
    game.status === 'PLAYING' &&
    game.players.every((p) => {
      const state = summary(game, p.id);
      return state.items.length >= game.config.maxItemsPerPlayer || state.balance < 1;
    });
  async function assign() {
    if (!current || !player || transitioning) return;
    const who = game!.players.find((p) => p.id === player)!.name;
    const card = cardRef.current,
      cardRect = card?.getBoundingClientRect(),
      playerIndex = game!.players.findIndex((p) => p.id === player);
    void audioService.unlock();
    if (await store.assign(player, Number(price), current.id)) {
      animateExit(
        card,
        motion,
        document.querySelector<HTMLElement>(`.player-${playerIndex + 1}`),
        cardRect,
      );
      setReversing(false);
      setPulse((n) => n + 1);
      if (motion === 'full') {
        setTransitioning(true);
        timer.current = setTimeout(() => setTransitioning(false), motionDurations.event);
      }
      setFeedback(`${current.name} → ${who} · $${price}`);
      setPlayer(null);
      setPrice('1');
    }
  }
  async function undo() {
    if (timer.current) clearTimeout(timer.current);
    setTransitioning(false);
    clearExits();
    if (await store.undo()) {
      setPulse((n) => n + 1);
      setPlayer(null);
      setPrice('1');
      setReversing(true);
      setFeedback('Última decisión deshecha.');
    }
  }
  return (
    <div className={`play-layout ${!game.openingAuction.confirmed ? 'opening-layout' : ''}`}>
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
        {!game.openingAuction.confirmed ? (
          <OpeningWheel key={game.id} game={game} />
        ) : game.status === 'FINISHED' ? (
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
            <Button
              onClick={async () => {
                await store.viewResults();
                navigate('/game/results');
              }}
            >
              Ver resultados
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <>
            <div
              className={`current-card ${reversing ? 'undo-card' : ''}`}
              ref={cardRef}
              key={current.id}
            >
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
            <div className="players-grid" key={pulse}>
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
            {noBalance && (
              <div className="notice error-notice" role="status">
                <strong>No hay saldo para otra compra.</strong>
                <p>
                  Los jugadores elegibles no pueden pagar el mínimo de $1. Puedes deshacer la última
                  compra o preparar otra partida.
                </p>
                <Button asChild variant="secondary">
                  <Link to="/game/new">Preparar otra partida</Link>
                </Button>
              </div>
            )}
            <div className="price-panel panel">
              <h2>
                <Coins size={20} aria-hidden="true" />
                ¿Por cuánto?
              </h2>
              <div className="quick-prices" role="group" aria-label="Precios rápidos">
                {[1, 2, 3, 4, 5, 10].map((p) => (
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
              <Field label="Otro monto" hint="La subasta comienza en $1." error={priceError}>
                {(id, desc) => (
                  <Input
                    id={id}
                    aria-describedby={desc}
                    aria-invalid={!!priceError}
                    type="number"
                    min="1"
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
                disabled={!player || !validPrice || !!priceError || store.busy || transitioning}
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
      {game.openingAuction.confirmed && (
        <aside className="history panel">
          <div className="between">
            <h2>Lo que pasó</h2>
            <span className="muted">{assigned.length} asignados</span>
          </div>
          {!assigned.length ? (
            <p className="muted">La primera decisión aún está por tomarse.</p>
          ) : (
            <ol>
              {assigned
                .filter((i) => !i.autoAssigned)
                .map((i) => (
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
          {auto.length > 0 && (
            <p className="notice">
              {auto.length} ítems asignados automáticamente a{' '}
              {game.players.find((p) => p.id === auto[0].assignedPlayerId)?.name} por $0. Se revelan
              en resultados.
            </p>
          )}
          <p className="history-note">La clasificación se revela al final.</p>
        </aside>
      )}
    </div>
  );
}
