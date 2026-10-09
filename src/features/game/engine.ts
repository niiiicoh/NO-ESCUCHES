import type { Choice, Game, GameConfig, Setup } from '../../types';
export const normalize = (s: string) => s.trim().normalize('NFKC').toLocaleLowerCase('es');
const integer = (n: number, min = 0) => Number.isSafeInteger(n) && n >= min;
export function validateConfig(c: GameConfig): string[] {
  const e: string[] = [];
  if (!integer(c.startingMoney)) e.push('El dinero inicial debe ser un entero no negativo.');
  if (!integer(c.totalItems, 2)) e.push('El total debe ser un entero de al menos 2 ítems.');
  if (
    !integer(c.maxItemsPerPlayer, 1) ||
    c.maxItemsPerPlayer > c.totalItems ||
    c.maxItemsPerPlayer < Math.ceil(c.totalItems / 2)
  )
    e.push(
      `Con ${c.totalItems} ítems, el límite debe estar entre ${Math.ceil(c.totalItems / 2)} y ${c.totalItems}.`,
    );
  if (!integer(c.badCount) || c.badCount > c.totalItems)
    e.push('La cantidad de malos debe ser un entero entre 0 y el total.');
  if (!c.categoryName.trim()) e.push('Escribe un nombre para la temática.');
  return e;
}
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function selectRandom(
  pool: Choice[],
  total: number,
  bad: number,
  rng: () => number = Math.random,
): Choice[] {
  const result: Choice[] = [];
  for (const [type, count] of [
    ['GOOD', total - bad],
    ['BAD', bad],
  ] as const) {
    const available = pool.filter((i) => i.type === type);
    if (count > available.length)
      throw new Error(
        `Necesitas ${count} ítems ${type === 'GOOD' ? 'buenos' : 'malos'} y esta categoría tiene ${available.length}. Añade ${count - available.length} o cambia la composición.`,
      );
    result.push(...shuffle(available, rng).slice(0, count));
  }
  return shuffle(result, rng);
}
export function validateSetup(s: Setup): string[] {
  const e = validateConfig(s.config);
  if (s.names.some((n) => !n.trim())) e.push('Ambos jugadores necesitan un nombre.');
  if (s.choices.length !== s.config.totalItems)
    e.push(`Selecciona exactamente ${s.config.totalItems} ítems; tienes ${s.choices.length}.`);
  if (s.choices.some((i) => !i.name.trim()))
    e.push('Completa todas las filas vacías o elimínalas.');
  if (
    new Set(s.choices.map((i) => normalize(i.name))).size !== s.choices.length ||
    new Set(s.choices.map((i) => i.id)).size !== s.choices.length
  )
    e.push('Hay ítems repetidos. Usa nombres únicos sin distinguir mayúsculas.');
  return e;
}
export function createGame(s: Setup, rng: () => number = Math.random): Game {
  const errors = validateSetup(s);
  if (errors.length) throw new Error(errors.join(' '));
  return {
    id: crypto.randomUUID(),
    config: {
      ...s.config,
      categoryName: s.config.categoryName.trim(),
      badCount: s.choices.filter((i) => i.type === 'BAD').length,
    },
    players: s.names.map((name) => ({
      id: crypto.randomUUID(),
      name: name.trim(),
      startingMoney: s.config.startingMoney,
    })) as Game['players'],
    items: shuffle(s.choices, rng).map((i, order) => ({
      id: crypto.randomUUID(),
      sourceItemId: i.sourceItemId,
      categoryId: i.categoryId,
      name: i.name.trim(),
      type: i.type,
      order,
      assignedPlayerId: null,
      price: 0,
      autoAssigned: false,
    })),
    currentItemIndex: 0,
    status: 'PLAYING',
    createdAt: new Date().toISOString(),
  };
}
export function summary(g: Game, playerId: string) {
  const player = g.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Jugador inexistente.');
  const items = g.items.filter((i) => i.assignedPlayerId === playerId),
    spent = items.reduce((n, i) => n + i.price, 0);
  return {
    items,
    spent,
    balance: player.startingMoney - spent,
    good: items.filter((i) => i.type === 'GOOD').length,
    bad: items.filter((i) => i.type === 'BAD').length,
  };
}
export function assignItem(
  game: Game,
  playerId: string,
  price: number,
  expectedItemId: string,
): Game {
  if (game.status !== 'PLAYING') throw new Error('No hay una partida activa.');
  const current = game.items[game.currentItemIndex];
  if (!current || current.id !== expectedItemId || current.assignedPlayerId !== null)
    throw new Error('Esta decisión ya fue registrada.');
  if (!integer(price)) throw new Error('El precio debe ser un entero no negativo.');
  const s = summary(game, playerId);
  if (s.items.length >= game.config.maxItemsPerPlayer)
    throw new Error('Este jugador llegó al límite.');
  if (price > s.balance)
    throw new Error(`Le quedan $${s.balance}. El precio no puede superar ese saldo.`);
  const g = structuredClone(game);
  Object.assign(g.items[g.currentItemIndex], { assignedPlayerId: playerId, price });
  if (s.items.length + 1 === g.config.maxItemsPerPlayer) {
    const other = g.players.find((p) => p.id !== playerId)!;
    for (const i of g.items)
      if (i.assignedPlayerId === null)
        Object.assign(i, { assignedPlayerId: other.id, price: 0, autoAssigned: true });
  }
  const next = g.items.findIndex((i) => i.assignedPlayerId === null);
  g.currentItemIndex = next < 0 ? g.items.length : next;
  g.status = next < 0 ? 'FINISHED' : 'PLAYING';
  return g;
}
