import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Layers, Users, Shuffle, MoveUpRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAppStore } from '../features/game/store';
export function Home() {
  const navigate = useNavigate();
  const game = useAppStore((s) => s.currentGame);
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="live-dot" />
            El juego pasa en la mesa
          </p>
          <h1>
            Compra primero.
            <br />
            <span>Pregunta después.</span>
          </h1>
          <p className="hero-description">
            Dos jugadores, un presupuesto y unas cuantas decisiones cuestionables. Tú llevas la
            partida. Ellos se arreglan.
          </p>
          <div className="actions">
            <Button asChild>
              <Link to={game?.status === 'PLAYING' ? '/game/play' : '/game/new'}>
                {game?.status === 'PLAYING' ? 'Continuar partida' : 'Nueva partida'}
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
            </Button>
            {game?.status === 'FINISHED' && (
              <Button asChild variant="secondary">
                <Link
                  to="/game/results"
                  onClick={async (e) => {
                    e.preventDefault();
                    await useAppStore.getState().viewResults();
                    navigate('/game/results');
                  }}
                >
                  Ver resultados
                </Link>
              </Button>
            )}
          </div>
          <p className="hero-note">Presencial. Sin cuentas. Con cero garantías de buen gusto.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-card art-card-back">
            <Layers size={64} />
          </div>
          <div className="art-card art-card-front">
            <span className="card-micro">NO ESCUCHES</span>
            <span className="big-question">?</span>
            <div className="card-bottom">
              <span>Todo puede tocarte.</span>
              <MoveUpRight size={24} />
            </div>
          </div>
          <span className="art-caption">QUE EMPIECE EL PROBLEMA.</span>
        </div>
      </section>
      <section className="home-how" aria-label="Cómo jugar">
        <div>
          <Users aria-hidden="true" />
          <h2>Junta a dos jugadores</h2>
          <p>El host usa la app. La conversación ocurre cara a cara.</p>
        </div>
        <div>
          <Shuffle aria-hidden="true" />
          <h2>Prepara la mezcla</h2>
          <p>Elige una temática y cuántas buenas ideas entran.</p>
        </div>
        <div>
          <Layers aria-hidden="true" />
          <h2>Asigna y revela</h2>
          <p>Registra las compras. Descubre el resultado al final.</p>
        </div>
      </section>
      <div className="home-bottom">
        <p>¿Ya tienes una temática en mente?</p>
        <Link to="/categories">
          Explorar categorías <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}
