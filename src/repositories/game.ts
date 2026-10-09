import { storage, keys } from '../lib/storage';
import { gameStateSchema } from '../lib/schemas';
import type { PersistedGameState } from '../types';
export interface GameRepository {
  load(): Promise<PersistedGameState>;
  save(state: PersistedGameState): Promise<void>;
}
export const gameRepository: GameRepository = {
  async load() {
    return (
      storage.read(keys.game, gameStateSchema) ?? {
        version: 1,
        currentGame: null,
        undoSnapshot: null,
      }
    );
  },
  async save(state) {
    gameStateSchema.parse(state);
    storage.write(keys.game, state);
  },
};
