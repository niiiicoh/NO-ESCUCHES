export type ItemType = 'GOOD' | 'BAD';
export type SelectionMode = 'RANDOM' | 'MANUAL' | 'CUSTOM';
export interface Category {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  active: boolean;
  createdAt: string;
}
export interface Item {
  id: string;
  categoryId: string;
  name: string;
  type: ItemType;
  active: boolean;
  createdAt: string;
}
export interface Player {
  id: string;
  name: string;
  startingMoney: number;
}
export interface GameItem {
  id: string;
  sourceItemId?: string;
  categoryId?: string;
  name: string;
  type: ItemType;
  order: number;
  assignedPlayerId: string | null;
  price: number;
  autoAssigned: boolean;
}
export interface GameConfig {
  selectionMode: SelectionMode;
  categoryId?: string;
  categoryName: string;
  totalItems: number;
  maxItemsPerPlayer: number;
  startingMoney: number;
  badCount: number;
}
export interface Game {
  id: string;
  config: GameConfig;
  players: [Player, Player];
  items: GameItem[];
  currentItemIndex: number;
  status: 'PLAYING' | 'FINISHED';
  createdAt: string;
}
export interface PersistedGameState {
  version: 1;
  currentGame: Game | null;
  undoSnapshot: Game | null;
}
export interface Catalog {
  version: 1;
  categories: Category[];
  items: Item[];
}
export interface Choice {
  id: string;
  sourceItemId?: string;
  categoryId?: string;
  name: string;
  type: ItemType;
}
export interface Setup {
  names: [string, string];
  config: GameConfig;
  choices: Choice[];
}
