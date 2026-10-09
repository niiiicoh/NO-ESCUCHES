import { create } from 'zustand';
import type { Catalog, Game, PersistedGameState } from '../../types';
import { catalogRepository } from '../../repositories/catalog';
import { gameRepository } from '../../repositories/game';
import { assignItem, drawOpening, confirmOpening } from './engine';
import { emitEffect } from '../../services/events';
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
  draw(): Promise<boolean>;
  confirmOpening(): Promise<boolean>;
  viewResults(silent?: boolean): Promise<boolean>;
}
const message = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo completar la acción.';
export const useAppStore = create<State>((set, get) => {
  async function save(currentGame: Game | null, undoSnapshot: Game | null) {
    if (get().busy || get().errors.game) return false;
    set({ busy: true });
    try {
      await gameRepository.save({
        version: 2,
        currentGame,
        undoSnapshot,
        resultsViewedGameId: get().resultsViewedGameId,
      });
      set({ currentGame, undoSnapshot, errors: { ...get().errors, save: undefined } });
      return true;
    } catch (e) {
      set({ errors: { ...get().errors, save: message(e) } });
      emitEffect('REJECT');
      return false;
    } finally {
      set({ busy: false });
    }
  }
  return {
    version: 2,
    resultsViewedGameId: null,
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
          await gameRepository.save({
            version: 2,
            currentGame: null,
            undoSnapshot: null,
            resultsViewedGameId: null,
          });
          set({ currentGame: null, undoSnapshot: null, resultsViewedGameId: null });
        }
        set({ errors: { ...get().errors, [area]: undefined } });
      } catch (e) {
        set({ errors: { ...get().errors, [area]: message(e) } });
      }
    },
    async start(game) {
      if (await save(game, null)) {
        emitEffect('START', { gameId: game.id });
        return true;
      }
      return false;
    },
    async draw() {
      const game = get().currentGame;
      if (!game || get().busy) return false;
      try {
        const drawn = drawOpening(game);
        return await save(drawn, null);
      } catch (e) {
        set({ errors: { ...get().errors, save: message(e) } });
        emitEffect('REJECT');
        return false;
      }
    },
    async confirmOpening() {
      const game = get().currentGame;
      if (!game || get().busy) return false;
      try {
        return await save(confirmOpening(game), null);
      } catch (e) {
        set({ errors: { ...get().errors, save: message(e) } });
        emitEffect('REJECT');
        return false;
      }
    },
    async viewResults(silent = false) {
      const game = get().currentGame;
      if (
        !game ||
        game.status !== 'FINISHED' ||
        get().resultsViewedGameId === game.id ||
        get().busy
      )
        return false;
      const old = get().resultsViewedGameId;
      set({ resultsViewedGameId: game.id });
      if (await save(game, get().undoSnapshot)) {
        if (!silent) emitEffect('REVEAL', { gameId: game.id });
        return true;
      }
      set({ resultsViewedGameId: old });
      return false;
    },
    async assign(playerId, price, itemId) {
      if (get().busy) return false;
      const game = get().currentGame;
      if (!game) return false;
      try {
        const next = assignItem(game, playerId, price, itemId);
        if (await save(next, structuredClone(game))) {
          emitEffect('PURCHASE', {
            gameId: game.id,
            playerIndex: game.players.findIndex((p) => p.id === playerId),
            autoCount: next.items.filter((i) => i.autoAssigned).length,
            finished: next.status === 'FINISHED',
          });
          return true;
        }
        return false;
      } catch (e) {
        set({ errors: { ...get().errors, save: message(e) } });
        emitEffect('REJECT');
        return false;
      }
    },
    async undo() {
      const snapshot = get().undoSnapshot;
      if (snapshot && (await save(structuredClone(snapshot), null))) {
        emitEffect('UNDO', { gameId: snapshot.id });
        return true;
      }
      return false;
    },
  };
});
