import { useSyncExternalStore } from 'react';
import { usePreferences, type MotionPreference } from './store';
export const motionDurations = {
  press: 100,
  selection: 160,
  panel: 240,
  event: 360,
  stagger: 40,
  wheel: 2600,
} as const;
export type EffectiveMotion = 'full' | 'reduced' | 'none';
export function effectiveMotion(
  preference: MotionPreference,
  systemReduced: boolean,
): EffectiveMotion {
  return preference === 'none'
    ? 'none'
    : preference === 'reduced' || systemReduced
      ? 'reduced'
      : 'full';
}
const getSystem = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const subscribe = (callback: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
export function useMotion() {
  const preference = usePreferences((s) => s.preferences.motion),
    system = useSyncExternalStore(subscribe, getSystem, () => false);
  return effectiveMotion(preference, system);
}
