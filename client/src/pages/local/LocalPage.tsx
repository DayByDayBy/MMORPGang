import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MIN_PLAYERS, MAX_PLAYERS } from "shared";
import type { GameMode } from "shared";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/Button";
import { GameModeToggle } from "@/components/GameModeToggle";

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
        <h2 className="m-0 mb-1 text-2xl">Local Game</h2>
        <p className="text-text-muted text-sm mb-6">Play against bots</p>

        <form onSubmit={handleStart} className="flex flex-col gap-6">
          <GameModeToggle value={mode} onChange={setMode} />

          <label className="flex flex-col gap-1 text-neutral-400 text-left text-sm">
            <span>Players: <span className="font-bold">{playerCount}</span></span>
            <input
              type="range"
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-text-dim text-xs">
              <span>{MIN_PLAYERS}</span>
              <span>{MAX_PLAYERS}</span>
            </div>
          </label>

          <Button type="submit" size="lg">
            Start Game
          </Button>

          <Button variant="link" className="text-sm" type="button" onClick={() => navigate("/")}>
            Back
          </Button>
        </form>
      </div>
    </div>
  );
};
