import { storage, keys } from '../lib/storage';
import { gameStateSchema, currentGameStateSchema } from '../lib/schemas';
import type { PersistedGameState } from '../types';
export interface GameRepository {
  load(): Promise<PersistedGameState>;
  save(state: PersistedGameState): Promise<void>;
}
export const gameRepository: GameRepository = {
  async load() {
    return (
      storage.read(keys.game, gameStateSchema) ?? {
        version: 2,
        resultsViewedGameId: null,
        currentGame: null,
        undoSnapshot: null,
      }
    );
  },
  async save(state) {
    currentGameStateSchema.parse(state);
    storage.write(keys.game, state);
  },
};
