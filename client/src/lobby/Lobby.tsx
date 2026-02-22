import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const Lobby = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="p-10 w-[400px] max-w-[90vw] text-center">
        <h1 className="m-0">PONG ARENA</h1>
        <p className="text-text-muted mb-8">Multiplayer pong</p>

        <div className="flex flex-col gap-4">
          <button
            className="px-6 py-3 border-none bg-green-500 text-white text-base cursor-pointer"
            onClick={() => navigate("/host")}
          >
            New Game
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Room ID..."
              className="flex-1 min-w-0 px-3 py-2 border border-border bg-surface-elevated text-white text-base outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && roomId.trim()) navigate(`/${roomId.trim()}`);
              }}
            />
            <button
              disabled={!roomId.trim()}
              className="shrink-0 px-6 py-3 border-none bg-blue-500 text-white text-base cursor-pointer disabled:opacity-50 disabled:cursor-default"
              onClick={() => navigate(`/${roomId.trim()}`)}
            >
              Join
            </button>
          </div>

          <div className="flex items-center gap-3 text-text-dim text-[13px] before:content-[''] before:flex-1 before:border-t before:border-white/10 after:content-[''] after:flex-1 after:border-t after:border-white/10">
            <span>or</span>
          </div>

          <button
            className="px-6 py-3 bg-surface-elevated border border-border text-neutral-300 text-base cursor-pointer"
            onClick={() => navigate("/local")}
          >
            Play Local
          </button>
        </div>
      </div>
    </div>
  );
};
