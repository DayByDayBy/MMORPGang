import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";

export const HomePage = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="p-10 w-[400px] max-w-[90vw] text-center">
        <h1 className="m-0">MMORPONG</h1>
        <p className="text-text-muted mb-8">Multiplayer pong</p>

        <div className="flex flex-col gap-4">
          <Button variant="success" size="lg" onClick={() => navigate("/host")}>
            New Game
          </Button>

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
            <Button
              disabled={!roomId.trim()}
              className="shrink-0"
              size="lg"
              onClick={() => navigate(`/${roomId.trim()}`)}
            >
              Join
            </Button>
          </div>

          <div className="flex items-center gap-3 text-text-dim text-[13px] before:content-[''] before:flex-1 before:border-t before:border-white/10 after:content-[''] after:flex-1 after:border-t after:border-white/10">
            <span>or</span>
          </div>

          <Button variant="ghost" size="lg" onClick={() => navigate("/local")}>
            Play Local
          </Button>
        </div>
      </div>
    </div>
  );
};
