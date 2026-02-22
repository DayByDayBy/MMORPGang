import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GameMode, BaseGameState } from "shared";
import type { Room } from "@colyseus/sdk";
import { useGame } from "../context/GameContext";
import { createRoom } from "../network/client";

export const HostPage = () => {
  const navigate = useNavigate();
  const { setRoom, setError } = useGame();
  const [mode, setMode] = useState<GameMode>("classic");
  const [creating, setCreating] = useState(false);
  const [hostError, setHostError] = useState("");

  const handleCreate = async () => {
    setCreating(true);
    setHostError("");
    setError("");
    try {
      const room = await createRoom(mode);
      setRoom(room as Room<BaseGameState>, mode);
      navigate(`/${room.roomId}`, { replace: true });
    } catch (e: any) {
      setHostError(e.message || "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="p-10 w-[400px] max-w-[90vw] text-center">
        <h2 className="m-0 mb-1">New Game</h2>
        <p className="text-text-muted text-sm mb-6">Pick a mode and create a room</p>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 text-neutral-400 text-left">
            Game Mode
            <div className="flex">
              <button
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

          <button
            disabled={creating}
            className="px-6 py-3 border-none bg-green-500 text-white text-base cursor-pointer disabled:opacity-50 disabled:cursor-default"
            onClick={handleCreate}
          >
            {creating ? "Creating..." : "Create Room"}
          </button>

          {hostError && <p className="text-red-500 text-sm m-0">{hostError}</p>}

          <button
            className="text-neutral-500 text-sm cursor-pointer bg-transparent border-none underline"
            onClick={() => navigate("/")}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};
