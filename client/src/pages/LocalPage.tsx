import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MIN_PLAYERS, MAX_PLAYERS, PLAYER_COLORS } from "shared";
import type { GameMode } from "shared";
import { useGame } from "../context/GameContext";

export const LocalPage = () => {
  const navigate = useNavigate();
  const { setLocalState } = useGame();
  const [mode, setMode] = useState<GameMode>("classic");
  const [playerCount, setPlayerCount] = useState(4);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalState({ playerName: "You", playerCount, gameMode: mode });
    navigate("/local/play");
  };

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="p-10 w-[400px] max-w-[90vw] text-center">
        <h2 className="m-0 mb-1">Local Game</h2>
        <p className="text-text-muted text-sm mb-6">Play against bots</p>

        <form onSubmit={handleStart} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 text-neutral-400 text-left">
            Game Mode
            <div className="flex">
              <button
                type="button"
                className={`flex-1 px-4 py-2 border border-border text-sm cursor-pointer ${
                  mode === "classic"
                    ? "bg-white/15 text-white border-white/30"
                    : "bg-surface-elevated text-text-muted"
                }`}
                onClick={() => setMode("classic")}
              >
                Classic
              </button>
              <button
                type="button"
                className={`flex-1 px-4 py-2 border border-border text-sm cursor-pointer ${
                  mode === "goals"
                    ? "bg-white/15 text-white border-white/30"
                    : "bg-surface-elevated text-text-muted"
                }`}
                onClick={() => setMode("goals")}
              >
                Goals
              </button>
            </div>
          </div>

          <label className="flex flex-col gap-2 text-neutral-400 text-left">
            Players: {playerCount}
            <input
              type="range"
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-text-dim">
              <span>{MIN_PLAYERS}</span>
              <span>{MAX_PLAYERS}</span>
            </div>
          </label>

          <div className="flex gap-2 justify-center flex-wrap">
            {Array.from({ length: playerCount }, (_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: PLAYER_COLORS[i] }}
                title={`Player ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="submit"
            className="px-6 py-3 border-none bg-blue-500 text-white text-base cursor-pointer"
          >
            Start Game
          </button>

          <button
            type="button"
            className="text-neutral-500 text-sm cursor-pointer bg-transparent border-none underline"
            onClick={() => navigate("/")}
          >
            Back
          </button>
        </form>
      </div>
    </div>
  );
};
