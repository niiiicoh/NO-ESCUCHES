import gsap from 'gsap';
import type { EffectiveMotion } from '../features/preferences/motion';
import { motionDurations } from '../features/preferences/motion';
const exits = new Set<{ node: HTMLElement; tween: gsap.core.Tween }>();
export function animateExit(
  element: HTMLElement | null,
  motion: EffectiveMotion,
  destination?: HTMLElement | null,
  origin?: DOMRect,
) {
  if (!element || motion === 'none') return;
  const rect = origin ?? element.getBoundingClientRect(),
    target = destination?.getBoundingClientRect(),
    node = element.cloneNode(true) as HTMLElement;
  node.removeAttribute('id');
  node.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
  node.setAttribute('aria-hidden', 'true');
  node.inert = true;
  Object.assign(node.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    zIndex: '40',
    pointerEvents: 'none',
    animation: 'none',
  });
  document.body.appendChild(node);
  const duration = motion === 'reduced' ? 0.08 : motionDurations.event / 1000;
  const record = {
    node,
    tween: gsap.to(node, {
      opacity: 0,
      x:
        motion === 'full' && target
          ? (target.left + target.width / 2 - rect.left - rect.width / 2) * 0.28
          : 0,
      y: motion === 'full' ? (target ? (target.top - rect.top) * 0.28 : -8) : 0,
      scale: motion === 'full' && target ? 0.94 : 1,
      duration,
      ease: 'power2.out',
      onComplete: () => {
        node.remove();
        exits.delete(record);
      },
    }),
  };
  exits.add(record);
}
export function clearExits() {
  for (const r of exits) {
    r.tween.kill();
    r.node.remove();
  }
  exits.clear();
}
