import type { Catalog, Choice, Game } from '../../types';
import { createGame, selectRandom } from './engine';
export function repeatGame(game: Game, catalog: Catalog | null): Game {
  let choices: Choice[];
  const temporary = game.items
    .filter((i) => !i.sourceItemId)
    .map((i) => ({ id: i.id, name: i.name, type: i.type }));
  if (game.config.selectionMode === 'CUSTOM') choices = temporary;
  else {
    const category = catalog?.categories.find((c) => c.id === game.config.categoryId && c.active);
    if (!category) throw new Error('La categoría ya no está disponible. Revisa la preparación.');
    const pool: Choice[] = [
      ...(catalog?.items
        .filter((i) => i.categoryId === category.id && i.active)
        .map((i) => ({
          id: i.id,
          sourceItemId: i.id,
          categoryId: i.categoryId,
          name: i.name,
          type: i.type,
        })) ?? []),
      ...temporary,
    ];
    if (game.config.selectionMode === 'RANDOM')
      choices = selectRandom(pool, game.config.totalItems, game.config.badCount);
    else
      choices = game.items.map((i) => {
        if (!i.sourceItemId) return { id: i.id, name: i.name, type: i.type };
        const choice = pool.find((x) => x.sourceItemId === i.sourceItemId);
        if (!choice) throw new Error(`«${i.name}» ya no está disponible. Revisa la selección.`);
        return choice;
      });
  }
  return createGame({
    names: [game.players[0].name, game.players[1].name],
    config: game.config,
    choices,
  });
}
