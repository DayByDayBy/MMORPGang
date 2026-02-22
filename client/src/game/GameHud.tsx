import { PLAYER_COLORS } from "shared";

export interface HudPlayer {
  name: string;
  emoji: string;
  lives: number;
  eliminated: boolean;
  colorIndex: number;
  isLocal?: boolean;
}

interface GameHudProps {
  players: HudPlayer[];
}

export const GameHud = ({ players }: GameHudProps) => {
  if (players.length === 0) return null;

  return (
    <div className="absolute top-4 left-4 z-50 flex flex-col gap-1 pointer-events-none select-none">
      {players.map((p, i) => {
        const color = PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length];
        const label = p.isLocal ? `${p.name} (you)` : p.name;
        return (
          <div key={i} className="text-sm font-bold" style={{ color }}>
            {label}:{" "}
            {p.eliminated ? (
              <span className="opacity-50">OUT</span>
            ) : (
              <span>{p.emoji.repeat(p.lives)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
