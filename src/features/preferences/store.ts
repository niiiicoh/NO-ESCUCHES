import { create } from 'zustand';
import { z } from 'zod';
import { storage, keys } from '../../lib/storage';
export type MotionPreference = 'system' | 'reduced' | 'none';
export interface Preferences {
  version: 1;
  soundEnabled: boolean;
  volume: number;
  motion: MotionPreference;
}
export const preferencesSchema = z.object({
  version: z.literal(1),
  soundEnabled: z.boolean(),
  volume: z.number().int().min(0).max(100),
  motion: z.enum(['system', 'reduced', 'none']),
});
const defaults: Preferences = { version: 1, soundEnabled: false, volume: 35, motion: 'system' };
interface PreferenceState {
  preferences: Preferences;
  ready: boolean;
  error: string;
  init(): void;
  update(values: Partial<Omit<Preferences, 'version'>>): boolean;
  reset(): void;
}
export const usePreferences = create<PreferenceState>((set, get) => ({
  preferences: defaults,
  ready: false,
  error: '',
  init() {
    if (get().ready) return;
    try {
      set({
        preferences: storage.read(keys.preferences, preferencesSchema) ?? { ...defaults },
        ready: true,
      });
    } catch (e) {
      set({
        ready: true,
        error: e instanceof Error ? e.message : 'No se pudieron recuperar las preferencias.',
      });
    }
  },
  update(values) {
    try {
      if (get().error) throw new Error('Restablece las preferencias antes de cambiarlas.');
      const preferences = preferencesSchema.parse({ ...get().preferences, ...values });
      storage.write(keys.preferences, preferences);
      set({ preferences, error: '' });
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'No se pudo guardar la preferencia.' });
      return false;
    }
  },
  reset() {
    try {
      storage.write(keys.preferences, defaults);
      set({ preferences: { ...defaults }, error: '' });
    } catch {
      set({ error: 'No se pudieron restablecer las preferencias.' });
    }
  },
}));
