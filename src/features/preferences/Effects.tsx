import { useEffect, useState } from 'react';
import { audioService } from '../../services/audio';
import { subscribeEffects } from '../../services/events';
import { usePreferences } from './store';
import { useMotion, motionDurations } from './motion';
export function Effects() {
  const preferences = usePreferences((s) => s.preferences),
    motion = useMotion(),
    [audioError, setAudioError] = useState('');
  useEffect(() => {
    audioService.configure(preferences);
  }, [preferences]);
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.motion = motion;
    for (const [key, value] of Object.entries(motionDurations))
      el.style.setProperty(`--motion-${key}`, `${value}ms`);
  }, [motion]);
  useEffect(() => {
    const consumed = new Set<string>();
    const unsubscribe = subscribeEffects((event) => {
      if (consumed.has(event.id) || document.hidden) return;
      consumed.add(event.id);
      if (consumed.size > 100) consumed.delete(consumed.values().next().value!);
      audioService.play(event);
    });
    const unlock = (e: Event) => {
      if (e instanceof KeyboardEvent && !['Enter', ' '].includes(e.key)) return;
      if (usePreferences.getState().preferences.soundEnabled) void audioService.unlock();
    };
    const hidden = () => {
      if (document.hidden) audioService.stop();
    };
    const status = (e: Event) => setAudioError((e as CustomEvent<string>).detail);
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('no-escuches:audio-status', status);
    return () => {
      unsubscribe();
      audioService.stop();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('no-escuches:audio-status', status);
    };
  }, []);
  return audioError ? (
    <p className="audio-status" role="status">
      {audioError}
    </p>
  ) : null;
}
