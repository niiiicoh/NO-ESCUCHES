export type EffectKind =
  | 'START'
  | 'DRAW'
  | 'DRAW_RESULT'
  | 'PURCHASE'
  | 'UNDO'
  | 'AUTO_ASSIGN'
  | 'FINISH'
  | 'REVEAL'
  | 'CATALOG_SAVE'
  | 'CATALOG_DELETE'
  | 'REJECT';
export interface EffectEvent {
  id: string;
  kind: EffectKind;
  gameId?: string;
  playerIndex?: number;
  autoCount?: number;
  finished?: boolean;
}
const subscribers = new Set<(event: EffectEvent) => void>();
export function emitEffect(
  kind: EffectKind,
  detail: Omit<Partial<EffectEvent>, 'id' | 'kind'> = {},
) {
  const event = { id: crypto.randomUUID(), kind, ...detail };
  subscribers.forEach((fn) => {
    try {
      fn(event);
    } catch {
      /* Presentation cannot invalidate a saved action. */
    }
  });
  return event;
}
export function subscribeEffects(fn: (event: EffectEvent) => void) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}
