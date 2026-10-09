import { z } from 'zod';
import { summary, validateConfig, normalize, isUndoTransition } from '../features/game/engine';
import type { Game, Catalog, PersistedGameState } from '../types';
const id = z.string().min(1),
  name = z.string().trim().min(1),
  int = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  type = z.enum(['GOOD', 'BAD']);
const category = z.object({
  id,
  name,
  emoji: z.string(),
  description: z.string().optional(),
  active: z.boolean(),
  createdAt: z.iso.datetime(),
});
const item = z.object({
  id,
  categoryId: id,
  name,
  type,
  active: z.boolean(),
  createdAt: z.iso.datetime(),
});
export const catalogSchema = z
  .object({ version: z.literal(1), categories: z.array(category), items: z.array(item) })
  .refine((c: Catalog) => {
    const categoryIds = new Set(c.categories.map((x) => x.id));
    return (
      categoryIds.size === c.categories.length &&
      new Set(c.items.map((x) => x.id)).size === c.items.length &&
      new Set(c.categories.map((x) => normalize(x.name))).size === c.categories.length &&
      c.items.every((x) => categoryIds.has(x.categoryId)) &&
      c.categories.every((cat) => {
        const names = c.items.filter((x) => x.categoryId === cat.id).map((x) => normalize(x.name));
        return new Set(names).size === names.length;
      })
    );
  }, 'El catálogo tiene referencias o nombres duplicados.');
const config = z.object({
  selectionMode: z.enum(['RANDOM', 'MANUAL', 'CUSTOM']),
  categoryId: id.optional(),
  categoryName: name,
  totalItems: int,
  maxItemsPerPlayer: int,
  startingMoney: int,
  badCount: int,
});
const gameItem = z.object({
  id,
  sourceItemId: id.optional(),
  categoryId: id.optional(),
  name,
  type,
  order: int,
  assignedPlayerId: id.nullable(),
  price: int,
  autoAssigned: z.boolean(),
});
const gameShape = z.object({
  id,
  config,
  players: z.tuple([
    z.object({ id, name, startingMoney: int }),
    z.object({ id, name, startingMoney: int }),
  ]),
  items: z.array(gameItem),
  currentItemIndex: int,
  status: z.enum(['PLAYING', 'FINISHED']),
  createdAt: z.iso.datetime(),
});
const openingSchema = z.object({
  startingPlayerId: id.nullable(),
  confirmed: z.boolean(),
  legacySkipped: z.literal(true).optional(),
});
function validStoredGame(g: Game): boolean {
  const playerIds = new Set(g.players.map((p) => p.id)),
    next = g.items.findIndex((i) => i.assignedPlayerId === null),
    opening = g.openingAuction;
  return (
    !validateConfig({ ...g.config, startingMoney: Math.max(1, g.config.startingMoney) }).length &&
    g.items.length === g.config.totalItems &&
    g.config.badCount === g.items.filter((i) => i.type === 'BAD').length &&
    playerIds.size === 2 &&
    new Set(g.items.map((i) => i.id)).size === g.items.length &&
    new Set(g.items.map((i) => normalize(i.name))).size === g.items.length &&
    g.items.every(
      (i, n) =>
        i.order === n &&
        (i.assignedPlayerId === null
          ? i.price === 0 && !i.autoAssigned
          : playerIds.has(i.assignedPlayerId)) &&
        (!i.autoAssigned || i.price === 0),
    ) &&
    g.players.every(
      (p) =>
        p.startingMoney === g.config.startingMoney &&
        summary(g, p.id).balance >= 0 &&
        summary(g, p.id).items.length <= g.config.maxItemsPerPlayer,
    ) &&
    (next < 0
      ? g.status === 'FINISHED' && g.currentItemIndex === g.items.length
      : g.status === 'PLAYING' &&
        g.currentItemIndex === next &&
        g.items.slice(next).every((i) => i.assignedPlayerId === null)) &&
    (opening.startingPlayerId === null || playerIds.has(opening.startingPlayerId)) &&
    (!opening.confirmed || !!opening.startingPlayerId || opening.legacySkipped === true) &&
    (!opening.legacySkipped || (opening.confirmed && opening.startingPlayerId === null)) &&
    (opening.confirmed || g.items.every((i) => i.assignedPlayerId === null))
  );
}
export const gameSchema = gameShape
  .extend({ openingAuction: openingSchema })
  .refine(validStoredGame, 'La partida guardada es incoherente.');
export const currentGameStateSchema = z
  .object({
    version: z.literal(2),
    currentGame: gameSchema.nullable(),
    undoSnapshot: gameSchema.nullable(),
    resultsViewedGameId: id.nullable(),
  })
  .refine(
    (s) => !s.undoSnapshot || (!!s.currentGame && isUndoTransition(s.currentGame, s.undoSnapshot)),
    'Snapshot incompatible.',
  );
const legacyGameSchema = gameShape
  .transform((g) => ({
    ...g,
    openingAuction: { startingPlayerId: null, confirmed: true, legacySkipped: true as const },
  }))
  .refine(validStoredGame, 'La partida antigua es incoherente.');
const legacyStateSchema = z
  .object({
    version: z.literal(1),
    currentGame: legacyGameSchema.nullable(),
    undoSnapshot: legacyGameSchema.nullable(),
  })
  .transform((s): PersistedGameState => {
    const started = !!s.currentGame?.items.some((i) => i.assignedPlayerId !== null);
    const opening: Game['openingAuction'] = started
      ? { startingPlayerId: null, confirmed: true, legacySkipped: true }
      : { startingPlayerId: null, confirmed: false };
    return {
      version: 2 as const,
      currentGame: s.currentGame ? { ...s.currentGame, openingAuction: opening } : null,
      undoSnapshot: s.undoSnapshot ? { ...s.undoSnapshot, openingAuction: { ...opening } } : null,
      resultsViewedGameId: null,
    };
  })
  .pipe(currentGameStateSchema);
export const gameStateSchema = z.union([currentGameStateSchema, legacyStateSchema]);
