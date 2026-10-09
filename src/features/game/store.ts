import { create } from 'zustand';
import type { Catalog, Game, PersistedGameState } from '../../types';
import { catalogRepository } from '../../repositories/catalog';
import { gameRepository } from '../../repositories/game';
import { assignItem } from './engine';
interface State extends PersistedGameState {
  ready: boolean;
  busy: boolean;
  catalog: Catalog | null;
  errors: Partial<Record<'catalog' | 'game' | 'save', string>>;
  init(): Promise<void>;
  refreshCatalog(): Promise<void>;
  recover(area: 'catalog' | 'game'): Promise<void>;
  start(game: Game): Promise<boolean>;
  assign(playerId: string, price: number, itemId: string): Promise<boolean>;
  undo(): Promise<boolean>;
}
const message = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo completar la acción.';
export const useAppStore = create<State>((set, get) => {
  async function save(currentGame: Game | null, undoSnapshot: Game | null) {
    if (get().busy || get().errors.game) return false;
    set({ busy: true });
    try {
      await gameRepository.save({ version: 1, currentGame, undoSnapshot });
      set({ currentGame, undoSnapshot, errors: { ...get().errors, save: undefined } });
      return true;
    } catch (e) {
      set({ errors: { ...get().errors, save: message(e) } });
      return false;
    } finally {
      set({ busy: false });
    }
  }
  return {
    version: 1,
    currentGame: null,
    undoSnapshot: null,
    ready: false,
    busy: false,
    catalog: null,
    errors: {},
    async init() {
      if (get().ready) return;
      const results = await Promise.allSettled([catalogRepository.load(), gameRepository.load()]);
      const errors: State['errors'] = {};
      if (results[0].status === 'fulfilled') set({ catalog: results[0].value });
      else errors.catalog = message(results[0].reason);
      if (results[1].status === 'fulfilled') set(results[1].value);
      else errors.game = message(results[1].reason);
      set({ ready: true, errors });
    },
    async refreshCatalog() {
      set({ catalog: await catalogRepository.load() });
    },
    async recover(area) {
      try {
        if (area === 'catalog') {
          set({ catalog: await catalogRepository.reset() });
        } else {
          await gameRepository.save({ version: 1, currentGame: null, undoSnapshot: null });
          set({ currentGame: null, undoSnapshot: null });
        }
        set({ errors: { ...get().errors, [area]: undefined } });
      } catch (e) {
        set({ errors: { ...get().errors, [area]: message(e) } });
      }
    },
    start(game) {
      return save(game, null);
    },
    async assign(playerId, price, itemId) {
      if (get().busy) return false;
      const game = get().currentGame;
      if (!game) return false;
      try {
        return await save(assignItem(game, playerId, price, itemId), structuredClone(game));
      } catch (e) {
        set({ errors: { ...get().errors, save: message(e) } });
        return false;
      }
    },
    async undo() {
      const snapshot = get().undoSnapshot;
      return snapshot ? save(structuredClone(snapshot), null) : false;
    },
  };
});
