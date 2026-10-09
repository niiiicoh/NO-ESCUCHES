import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Game } from '../../types';
import { useAppStore } from './store';
import { useMotion, motionDurations } from '../preferences/motion';
import { audioService } from '../../services/audio';
import { emitEffect } from '../../services/events';
import { Button } from '../../components/ui/button';
import { ArrowRight } from 'lucide-react';
export function wheelLanding(index: number) {
  return index === 0 ? 270 : 90;
}
export function OpeningWheel({ game }: { game: Game }) {
  const store = useAppStore(),
    motion = useMotion(),
    winner = game.players.findIndex((p) => p.id === game.openingAuction.startingPlayerId),
    [spinning, setSpinning] = useState(false),
    [announcement, setAnnouncement] = useState(''),
    wheel = useRef<HTMLDivElement>(null),
    tween = useRef<gsap.core.Timeline | null>(null),
    lock = useRef(false),
    mounted = useRef(true),
    silentFinish = useRef(false);
  useLayoutEffect(() => {
    if (!spinning && winner >= 0 && wheel.current) {
      gsap.set(wheel.current, { rotation: wheelLanding(winner) });
      gsap.set(wheel.current.querySelectorAll('.wheel-name'), { rotation: -wheelLanding(winner) });
    }
  }, [winner, spinning]);
  useEffect(() => {
    mounted.current = true;
    const visibility = () => {
      if (document.hidden) {
        silentFinish.current = true;
        tween.current?.progress(1);
        audioService.stop();
      }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      mounted.current = false;
      tween.current?.kill();
      audioService.stop();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => {
    if (motion !== 'full' && spinning) {
      tween.current?.progress(1);
      audioService.stop();
    }
  }, [motion, spinning]);
  async function draw() {
    if (lock.current || store.busy || game.openingAuction.startingPlayerId) return;
    lock.current = true;
    silentFinish.current = false;
    void audioService.unlock();
    if (!(await store.draw())) {
      lock.current = false;
      return;
    }
    if (!mounted.current) return;
    const latest = useAppStore.getState().currentGame!,
      index = latest.players.findIndex((p) => p.id === latest.openingAuction.startingPlayerId),
      name = latest.players[index].name;
    function finish() {
      if (!mounted.current) return;
      setSpinning(false);
      lock.current = false;
      setAnnouncement(`${name} comienza ofreciendo $1. Primera subasta.`);
      if (!silentFinish.current) emitEffect('DRAW_RESULT', { gameId: game.id });
    }
    if (motion !== 'full' || document.hidden) {
      finish();
      return;
    }
    setSpinning(true);
    const rotation = 360 * 5 + wheelLanding(index);
    gsap.set(wheel.current, { rotation: 0 });
    gsap.set(wheel.current!.querySelectorAll('.wheel-name'), { rotation: 0 });
    audioService.ticks(motionDurations.wheel);
    tween.current = gsap
      .timeline({ onComplete: finish })
      .to(wheel.current, { rotation, duration: motionDurations.wheel / 1000, ease: 'power3.out' })
      .to(
        wheel.current!.querySelectorAll('.wheel-name'),
        { rotation: -rotation, duration: motionDurations.wheel / 1000, ease: 'power3.out' },
        0,
      );
  }
  const resolved = winner >= 0 && !spinning;
  return (
    <section className="opening-panel">
      <p className="eyebrow">Antes de revelar el primer ítem</p>
      <h1>¿Quién rompe el hielo?</h1>
      <p className="muted">La ruleta decide la primera oferta. La compra la acuerdan en la mesa.</p>
      <div className="wheel-wrap" aria-hidden="true">
        <span className="wheel-pointer" />
        <div ref={wheel} className="wheel-face">
          <svg viewBox="-100 -100 200 200" className="wheel-segments">
            <path className="wheel-segment-1" d="M0 0 L0 -100 A100 100 0 0 1 0 100 Z" />
            <path className="wheel-segment-2" d="M0 0 L0 100 A100 100 0 0 1 0 -100 Z" />
          </svg>
          <span className="wheel-name wheel-name-1">{game.players[0].name}</span>
          <span className="wheel-name wheel-name-2">{game.players[1].name}</span>
        </div>
        <span className="wheel-hub">NE.</span>
      </div>
      <div className="wheel-legend">
        {game.players.map((p, i) => (
          <span className={`player-${i + 1}`} key={p.id}>
            <span className="identity-dot" />
            {p.name}
            <small>50%</small>
          </span>
        ))}
      </div>
      <div className="wheel-result">
        {resolved ? (
          <>
            <h2>{game.players[winner].name} comienza ofreciendo $1</h2>
            <p className="muted">Solo para la primera subasta. Todavía no se descuenta dinero.</p>
          </>
        ) : (
          <p className="muted">
            {spinning ? 'Decidiendo la primera oferta…' : 'Un giro. Dos posibilidades iguales.'}
          </p>
        )}
      </div>
      <div className="sr-only" role="status">
        {announcement}
      </div>
      {game.openingAuction.startingPlayerId === null ? (
        <Button className="wheel-action" disabled={store.busy || spinning} onClick={draw}>
          Girar ruleta
        </Button>
      ) : (
        <Button
          className="wheel-action"
          disabled={spinning || store.busy}
          onClick={() => void store.confirmOpening()}
        >
          Comenzar subasta
          <ArrowRight size={18} aria-hidden="true" />
        </Button>
      )}
      <p className="field-hint">El sorteo no elige al comprador de ningún ítem.</p>
    </section>
  );
}
