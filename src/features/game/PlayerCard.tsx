import type { Game, Player } from '../../types';
import { summary } from './engine';
import { Check } from 'lucide-react';
export function PlayerCard({
  game,
  player,
  index,
  selected,
  onSelect,
}: {
  game: Game;
  player: Player;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const s = summary(game, player.id);
  return (
    <button
      className={`player-card player-${index + 1} ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
      disabled={s.items.length >= game.config.maxItemsPerPlayer}
    >
      <span className="player-top">
        <span className="player-number">Jugador {index + 1}</span>
        {selected ? (
          <span className="selected-label">
            <Check size={14} aria-hidden="true" />
            Seleccionado
          </span>
        ) : (
          <span className="muted">Elegir</span>
        )}
      </span>
      <span className="player-name">{player.name}</span>
      <span className="player-stats">
        <strong key={s.balance} className="value-pulse">
          ${s.balance}
        </strong>
        <span key={s.items.length} className="value-pulse">
          {s.items.length} / {game.config.maxItemsPerPlayer} ítems
        </span>
      </span>
    </button>
  );
}
