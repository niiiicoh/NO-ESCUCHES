import { describe, it, expect } from 'vitest';
import { createGame, drawOpening, confirmOpening, assignItem, summary } from './engine';
import { gameStateSchema, currentGameStateSchema } from '../../lib/schemas';
import type { Game, GameConfig } from '../../types';
const config: GameConfig = {
  selectionMode: 'CUSTOM',
  categoryName: 'Prueba',
  totalItems: 4,
  maxItemsPerPlayer: 2,
  startingMoney: 3,
  badCount: 2,
};
const make = () =>
  createGame({
    names: ['A', 'B'],
    config,
    choices: [
      { id: '1', name: 'Uno', type: 'GOOD' },
      { id: '2', name: 'Dos', type: 'GOOD' },
      { id: '3', name: 'Tres', type: 'BAD' },
      { id: '4', name: 'Cuatro', type: 'BAD' },
    ],
  });
const stripOpening = (game: Game) => {
  const { openingAuction: _, ...legacy } = game;
  return legacy;
};
describe('ruleta inicial y migración', () => {
  it.each([
    [0, 0],
    [0.49999, 0],
    [0.5, 1],
    [0.99999, 1],
  ])('divide probabilidades por el punto medio %s', (rng, index) => {
    const game = make(),
      result = drawOpening(game, () => rng);
    expect(result.openingAuction.startingPlayerId).toBe(game.players[index].id);
    expect(result.items).toEqual(game.items);
    expect(summary(result, game.players[index].id).balance).toBe(3);
    expect(result.openingAuction.confirmed).toBe(false);
  });
  it('bloquea compra antes del sorteo y antes de confirmar', () => {
    const game = make(),
      drawn = drawOpening(game, () => 0.5);
    expect(() => assignItem(game, game.players[0].id, 1, game.items[0].id)).toThrow('ruleta');
    expect(() => assignItem(drawn, game.players[0].id, 1, game.items[0].id)).toThrow('ruleta');
    const ready = confirmOpening(drawn);
    expect(
      summary(assignItem(ready, game.players[0].id, 1, game.items[0].id), game.players[0].id)
        .balance,
    ).toBe(2);
  });
  it('no permite volver a sortear ni confirmar sin resultado', () => {
    const game = make();
    expect(() => confirmOpening(game)).toThrow('gira');
    const drawn = drawOpening(game, () => 0);
    expect(() => drawOpening(drawn, () => 0.9)).toThrow('resuelta');
    expect(() => drawOpening(confirmOpening(drawn))).toThrow('resuelta');
  });
  it.each([NaN, Infinity, -0.1, 1])('rechaza RNG inválido %s sin alterar la partida', (value) => {
    const game = make(),
      copy = structuredClone(game);
    expect(() => drawOpening(game, () => value)).toThrow('sorteo');
    expect(game).toEqual(copy);
  });
  it('reparto gratuito y snapshot conservan la apertura confirmada', () => {
    const ready = confirmOpening(drawOpening(make(), () => 0.75)),
      first = assignItem(ready, ready.players[0].id, 1, ready.items[0].id),
      end = assignItem(first, first.players[0].id, 1, first.items[1].id),
      saved = gameStateSchema.parse(
        JSON.parse(
          JSON.stringify({
            version: 2,
            currentGame: end,
            undoSnapshot: first,
            resultsViewedGameId: null,
          }),
        ),
      );
    expect(end.status).toBe('FINISHED');
    expect(end.items.filter((i) => i.autoAssigned).map((i) => i.price)).toEqual([0, 0]);
    expect(summary(end, end.players[1].id).balance).toBe(3);
    expect(saved.undoSnapshot?.openingAuction).toEqual(ready.openingAuction);
  });
  it('recupera el resultado previo al giro sin cambiar dinero u orden', () => {
    const game = drawOpening(make(), () => 0.75),
      restored = gameStateSchema.parse(
        JSON.parse(
          JSON.stringify({
            version: 2,
            currentGame: game,
            undoSnapshot: null,
            resultsViewedGameId: null,
          }),
        ),
      );
    expect(restored.currentGame).toEqual(game);
  });
  it('partida antigua vacía pasa a ruleta conservando su identidad', () => {
    const old = stripOpening(make()),
      saved = gameStateSchema.parse({ version: 1, currentGame: old, undoSnapshot: null });
    expect(saved.version).toBe(2);
    expect(saved.currentGame?.id).toBe(old.id);
    expect(saved.currentGame?.items).toEqual(old.items);
    expect(saved.currentGame?.openingAuction).toEqual({ startingPlayerId: null, confirmed: false });
  });
  it('conserva compras antiguas $0 y migra también undo antes de la primera compra', () => {
    const before = stripOpening(make()),
      old = structuredClone(before);
    old.items[0].assignedPlayerId = old.players[0].id;
    old.currentItemIndex = 1;
    const state = gameStateSchema.parse({ version: 1, currentGame: old, undoSnapshot: before });
    expect(state.currentGame?.openingAuction.legacySkipped).toBe(true);
    expect(state.undoSnapshot?.openingAuction.legacySkipped).toBe(true);
    expect(state.currentGame?.items[0].price).toBe(0);
    expect(summary(state.currentGame!, old.players[0].id).balance).toBe(3);
    expect(() => assignItem(state.currentGame!, old.players[0].id, 0, old.items[1].id)).toThrow(
      'mínima',
    );
    expect(
      assignItem(state.undoSnapshot!, old.players[0].id, 1, old.items[0].id).openingAuction,
    ).toEqual(state.currentGame?.openingAuction);
  });
  it('recupera dinero inicial antiguo 0 sin inventar dinero', () => {
    const old = stripOpening(make());
    old.config.startingMoney = 0;
    old.players.forEach((p) => (p.startingMoney = 0));
    old.items[0].assignedPlayerId = old.players[0].id;
    old.currentItemIndex = 1;
    const migrated = gameStateSchema.parse({
      version: 1,
      currentGame: old,
      undoSnapshot: null,
    }).currentGame!;
    expect(summary(migrated, old.players[0].id).balance).toBe(0);
    expect(() => assignItem(migrated, old.players[0].id, 1, old.items[1].id)).toThrow('saldo');
  });
  it('rechaza un resultado de otro jugador o asignaciones sin confirmación', () => {
    const g = drawOpening(make(), () => 0);
    g.openingAuction.startingPlayerId = 'nadie';
    expect(
      currentGameStateSchema.safeParse({
        version: 2,
        currentGame: g,
        undoSnapshot: null,
        resultsViewedGameId: null,
      }).success,
    ).toBe(false);
    const other = make();
    other.items[0].assignedPlayerId = other.players[0].id;
    other.items[0].price = 1;
    other.currentItemIndex = 1;
    expect(
      currentGameStateSchema.safeParse({
        version: 2,
        currentGame: other,
        undoSnapshot: null,
        resultsViewedGameId: null,
      }).success,
    ).toBe(false);
  });
});
