import { describe, expect, it } from 'vitest';
import { seedCatalog } from '../../data/seed';
import { createGame, selectRandom, assignItem, drawOpening, confirmOpening } from './engine';
import { repeatGame } from './repeat';
import type { Choice, GameConfig } from '../../types';
const config: GameConfig = {
  selectionMode: 'RANDOM',
  categoryId: 'pizza',
  categoryName: 'Pizza',
  totalItems: 8,
  maxItemsPerPlayer: 4,
  startingMoney: 20,
  badCount: 6,
};
describe('repetir configuración', () => {
  it('crea nuevos IDs, conserva reglas y reinicia todas las asignaciones', () => {
    const catalog = seedCatalog(),
      pool: Choice[] = catalog.items
        .filter((i) => i.categoryId === 'pizza')
        .map((i) => ({ ...i, sourceItemId: i.id }));
    let game = createGame({
      names: ['Nico', 'Bastián'],
      config,
      choices: selectRandom(pool, 8, 6),
    });
    game = confirmOpening(drawOpening(game, () => 0.25));
    for (let i = 0; i < 4; i++)
      game = assignItem(game, game.players[0].id, 3, game.items[game.currentItemIndex].id);
    const repeat = repeatGame(game, catalog);
    expect(repeat.id).not.toBe(game.id);
    expect(repeat.players[0].id).not.toBe(game.players[0].id);
    expect(repeat.status).toBe('PLAYING');
    expect(repeat.openingAuction).toEqual({ startingPlayerId: null, confirmed: false });
    expect(repeat.currentItemIndex).toBe(0);
    expect(repeat.config).toEqual(game.config);
    expect(
      repeat.items.every((i) => i.assignedPlayerId === null && i.price === 0 && !i.autoAssigned),
    ).toBe(true);
    expect(repeat.items.filter((i) => i.type === 'BAD')).toHaveLength(6);
  });
  it('vuelve a validar categoría e ítems inactivos al repetir manualmente', () => {
    const catalog = seedCatalog(),
      choices = catalog.items
        .filter((i) => i.categoryId === 'pizza')
        .slice(0, 8)
        .map((i) => ({ ...i, sourceItemId: i.id })),
      game = createGame({
        names: ['A', 'B'],
        config: { ...config, selectionMode: 'MANUAL', badCount: 0 },
        choices,
      });
    catalog.items[0].active = false;
    expect(() => repeatGame(game, catalog)).toThrow('ya no está disponible');
    catalog.categories[0].active = false;
    expect(() => repeatGame(game, catalog)).toThrow('categoría');
  });
  it('personalizada se repite aunque no haya catálogo', () => {
    const choices: Choice[] = [
        { id: 'a', name: 'Algo bueno', type: 'GOOD' },
        { id: 'b', name: 'Otra cosa', type: 'GOOD' },
      ],
      game = createGame({
        names: ['A', 'B'],
        config: {
          ...config,
          selectionMode: 'CUSTOM',
          categoryId: undefined,
          totalItems: 2,
          maxItemsPerPlayer: 1,
          badCount: 0,
        },
        choices,
      });
    const repeat = repeatGame(game, null);
    expect(repeat.items.map((i) => i.name).sort()).toEqual(game.items.map((i) => i.name).sort());
    expect(repeat.config.badCount).toBe(0);
  });
});
