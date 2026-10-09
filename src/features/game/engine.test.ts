import { describe, it, expect } from 'vitest';
import { createGame, selectRandom, assignItem, summary, validateConfig } from './engine';
import { seedCatalog } from '../../data/seed';
import { gameStateSchema, catalogSchema } from '../../lib/schemas';
import { JsonStorage, type StorageAdapter } from '../../lib/storage';
import type { GameConfig, Game } from '../../types';
const config: GameConfig = {
  selectionMode: 'RANDOM',
  categoryId: 'pizza',
  categoryName: 'Pizza',
  totalItems: 8,
  maxItemsPerPlayer: 4,
  startingMoney: 20,
  badCount: 4,
};
const pool = seedCatalog()
  .items.filter((i) => i.categoryId === 'pizza')
  .map((i) => ({ ...i, sourceItemId: i.id }));
const make = (overrides: Partial<GameConfig> = {}) => {
  const c = { ...config, ...overrides };
  return createGame({
    names: ['Nicolás', 'Bastián'],
    config: c,
    choices: selectRandom(pool, c.totalItems, c.badCount),
  });
};
describe('motor de la partida', () => {
  it.each([0, 2, 4, 6, 8])('preserva la composición %i malos sin repetición', (badCount) => {
    for (let i = 0; i < 30; i++) {
      const g = make({ badCount });
      expect(g.items).toHaveLength(8);
      expect(g.items.filter((i) => i.type === 'BAD')).toHaveLength(badCount);
      expect(new Set(g.items.map((i) => i.sourceItemId)).size).toBe(8);
    }
  });
  it('informa capacidad insuficiente por tipo', () =>
    expect(() => selectRandom(pool, 10, 0)).toThrow('Necesitas 10 ítems buenos'));
  it('recorta nombres y conserva exactamente las opciones manuales', () => {
    const choices = [
      ...pool.filter((i) => i.type === 'GOOD').slice(0, 1),
      ...pool.filter((i) => i.type === 'BAD').slice(0, 7),
    ];
    const g = createGame({
      names: ['  Nico  ', ' Bastián '],
      config: { ...config, selectionMode: 'MANUAL', badCount: 7 },
      choices,
    });
    expect(g.players[0].name).toBe('Nico');
    expect(g.items.map((i) => i.sourceItemId).sort()).toEqual(choices.map((i) => i.id).sort());
  });
  it.each([-1, 1.5, NaN, Infinity, 21])(
    'rechaza precio inválido %s y no muta la partida',
    (price) => {
      const g = make(),
        snapshot = structuredClone(g);
      expect(() => assignItem(g, g.players[0].id, price, g.items[0].id)).toThrow();
      expect(g).toEqual(snapshot);
    },
  );
  it('cobra $3 una sola vez, rechaza la decisión anterior y acepta $0 sin dinero', () => {
    const g = make();
    const next = assignItem(g, g.players[0].id, 3, g.items[0].id);
    expect(summary(next, g.players[0].id).balance).toBe(17);
    expect(() => assignItem(next, g.players[0].id, 3, g.items[0].id)).toThrow('ya fue registrada');
    const zero = make({ startingMoney: 0 });
    expect(
      summary(assignItem(zero, zero.players[0].id, 0, zero.items[0].id), zero.players[0].id)
        .balance,
    ).toBe(0);
  });
  it('reparte lo restante gratis y permite restaurar el snapshot completo', () => {
    let g = make();
    for (let n = 0; n < 3; n++)
      g = assignItem(g, g.players[0].id, 3, g.items[g.currentItemIndex].id);
    const before = structuredClone(g),
      end = assignItem(g, g.players[0].id, 2, g.items[g.currentItemIndex].id);
    expect(end.status).toBe('FINISHED');
    expect(end.items.filter((i) => i.autoAssigned)).toHaveLength(4);
    expect(summary(end, g.players[1].id).balance).toBe(20);
    const restored = gameStateSchema.parse(
      JSON.parse(JSON.stringify({ version: 1, currentGame: end, undoSnapshot: before })),
    );
    expect(restored.undoSnapshot).toEqual(before);
    expect(restored.undoSnapshot?.status).toBe('PLAYING');
    expect(restored.undoSnapshot?.currentItemIndex).toBe(3);
    expect(end.items.map((i) => i.id)).toEqual(before.items.map((i) => i.id));
  });
  it('finaliza por agotamiento sin alcanzar un límite de 5', () => {
    let g = make({ maxItemsPerPlayer: 5 });
    for (let n = 0; n < 8; n++)
      g = assignItem(g, g.players[n % 2].id, 0, g.items[g.currentItemIndex].id);
    expect(g.status).toBe('FINISHED');
    expect(g.items.some((i) => i.autoAssigned)).toBe(false);
  });
  it.each([
    [8, 3, false],
    [8, 5, true],
    [9, 5, true],
    [2, 1, true],
    [8, 9, false],
    [8, 4.5, false],
  ])('valida total %i y límite %s', (totalItems, maxItemsPerPlayer, valid) =>
    expect(
      validateConfig({
        ...config,
        totalItems,
        maxItemsPerPlayer,
        badCount: Math.min(4, totalItems),
      }).length === 0,
    ).toBe(valid),
  );
  it('no comparte entidades con el catálogo ni determina un ganador', () => {
    const g = make(),
      name = g.items[0].name;
    pool.find((i) => i.id === g.items[0].sourceItemId)!.name = 'Cambio';
    expect(g.items[0].name).toBe(name);
    expect(summary(g, g.players[0].id)).not.toHaveProperty('winner');
  });
  it('rechaza filas vacías y duplicados normalizados', () => {
    const c = {
      ...config,
      selectionMode: 'CUSTOM' as const,
      totalItems: 2,
      maxItemsPerPlayer: 1,
      badCount: 0,
    };
    expect(() =>
      createGame({
        names: ['A', 'B'],
        config: c,
        choices: [
          { id: '1', name: '  PAN ', type: 'GOOD' },
          { id: '2', name: 'pan', type: 'GOOD' },
        ],
      }),
    ).toThrow('repetidos');
    expect(() =>
      createGame({
        names: ['A', 'B'],
        config: c,
        choices: [
          { id: '1', name: '', type: 'GOOD' },
          { id: '2', name: 'x', type: 'GOOD' },
        ],
      }),
    ).toThrow('vacías');
  });
});
describe('persistencia validada', () => {
  it('rechaza saldo negativo, índice alterado y dueño inexistente', () => {
    for (const mutate of [
      (g: Game) => {
        g.items[0].assignedPlayerId = g.players[0].id;
        g.items[0].price = 21;
        g.currentItemIndex = 1;
      },
      (g: Game) => {
        g.currentItemIndex = 7;
      },
      (g: Game) => {
        g.items[0].assignedPlayerId = 'nadie';
      },
    ]) {
      const g = make();
      mutate(g);
      expect(
        gameStateSchema.safeParse({ version: 1, currentGame: g, undoSnapshot: null }).success,
      ).toBe(false);
    }
  });
  it('rechaza catálogo con referencia inválida o duplicados entre tipos', () => {
    const c = seedCatalog();
    c.items[0].categoryId = 'inexistente';
    expect(catalogSchema.safeParse(c).success).toBe(false);
    const d = seedCatalog();
    d.items[8].name = ' pepperoni ';
    expect(catalogSchema.safeParse(d).success).toBe(false);
  });
  it('muestra errores de JSON y de escritura sin fingir éxito', () => {
    const adapter: StorageAdapter = {
      getItem: () => '{bad',
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    const storage = new JsonStorage(() => adapter);
    expect(() => storage.read('catalog', catalogSchema)).toThrow('dañados');
    expect(() => storage.write('game', {})).toThrow('no se aplicaron');
    expect(() => storage.remove('game')).toThrow('restablecer');
  });
});
