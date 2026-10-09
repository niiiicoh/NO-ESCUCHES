import { z } from 'zod';
import { summary, validateConfig, normalize, assignItem } from '../features/game/engine';
import type { Game, Catalog } from '../types';
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
export const gameSchema = z
  .object({
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
  })
  .refine((g: Game) => {
    const playerIds = new Set(g.players.map((p) => p.id)),
      next = g.items.findIndex((i) => i.assignedPlayerId === null);
    return (
      !validateConfig(g.config).length &&
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
          g.items.slice(next).every((i) => i.assignedPlayerId === null))
    );
  }, 'La partida guardada es incoherente.');
export const gameStateSchema = z
  .object({
    version: z.literal(1),
    currentGame: gameSchema.nullable(),
    undoSnapshot: gameSchema.nullable(),
  })
  .refine((s) => {
    if (!s.undoSnapshot) return true;
    if (!s.currentGame || s.undoSnapshot.status !== 'PLAYING') return false;
    const item = s.currentGame.items[s.undoSnapshot.currentItemIndex];
    if (!item?.assignedPlayerId) return false;
    try {
      return (
        JSON.stringify(assignItem(s.undoSnapshot, item.assignedPlayerId, item.price, item.id)) ===
        JSON.stringify(s.currentGame)
      );
    } catch {
      return false;
    }
  }, 'Snapshot incompatible.');
