import { useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Repeat2, RotateCcw } from 'lucide-react';
import { useAppStore } from '../features/game/store';
import { summary } from '../features/game/engine';
import { repeatGame } from '../features/game/repeat';
import { Button } from '../components/ui/button';
import { Empty, PageHeading, TypeTag } from '../components/shared';
export function Results() {
  const store = useAppStore(),
    game = store.currentGame,
    navigate = useNavigate();
  useEffect(() => {
    if (game?.status === 'FINISHED') void store.viewResults(true);
  }, [game?.id, game?.status]);
  if (!game)
    return (
      <Empty
        title="Todavía no hay resultados."
        description="Prepara una partida y completa las asignaciones."
      />
    );
  if (game.status === 'PLAYING') return <Navigate to="/game/play" replace />;
  const auto = game.items.filter((i) => i.autoAssigned);
  return (
    <>
      <PageHeading
        title="Ahora sí. Mira lo que compraste."
        description={`${game.config.categoryName} · Partida terminada. Aquí no decidimos quién ganó.`}
      />
      {auto.length > 0 && (
        <p className="notice">
          Reparto automático: {auto.length} ítems para{' '}
          {game.players.find((p) => p.id === auto[0].assignedPlayerId)?.name} por $0, al llegar el
          otro jugador al límite.
        </p>
      )}
      <div className="results-grid">
        {game.players.map((p, index) => {
          const s = summary(game, p.id);
          return (
            <section className={`result-panel player-${index + 1}`} key={p.id}>
              <div className="result-title">
                <span className="eyebrow">Jugador {index + 1}</span>
                <h2>{p.name}</h2>
              </div>
              <div className="result-counts">
                <span className="good">✓ {s.good} buenos</span>
                <span className="bad">× {s.bad} malos</span>
              </div>
              <ul className="result-items">
                {s.items.map((i) => (
                  <li key={i.id}>
                    <div>
                      <strong>{i.name}</strong>
                      <div>
                        <TypeTag type={i.type} />
                        {i.autoAssigned && (
                          <small className="muted">Asignado automáticamente</small>
                        )}
                      </div>
                    </div>
                    <span>
                      {i.autoAssigned ? 'Automático' : 'Compra'} · ${i.price}
                    </span>
                  </li>
                ))}
              </ul>
              {!s.items.length && <p className="muted">No recibió ítems.</p>}
              <dl className="result-money">
                <div>
                  <dt>Dinero inicial</dt>
                  <dd>${p.startingMoney}</dd>
                </div>
                <div>
                  <dt>Gastado</dt>
                  <dd>${s.spent}</dd>
                </div>
                <div>
                  <dt>Restante</dt>
                  <dd>${s.balance}</dd>
                </div>
              </dl>
            </section>
          );
        })}
      </div>
      <div className="actions result-actions">
        <Button asChild>
          <Link to="/game/new">
            Nueva partida
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </Button>
        <Button
          variant="secondary"
          disabled={store.busy}
          onClick={async () => {
            try {
              const next = repeatGame(game, store.catalog);
              if (await store.start(next)) navigate('/game/play');
            } catch (e) {
              navigate('/game/new', {
                state: {
                  repeat: true,
                  repeatError: e instanceof Error ? e.message : 'Revisa la configuración.',
                },
              });
            }
          }}
        >
          <Repeat2 size={18} aria-hidden="true" />
          Repetir configuración
        </Button>
        <Button
          variant="ghost"
          disabled={!store.undoSnapshot || store.busy}
          onClick={async () => {
            if (await store.undo()) navigate('/game/play');
          }}
        >
          <RotateCcw size={18} aria-hidden="true" />
          Deshacer última acción
        </Button>
      </div>
    </>
  );
}
