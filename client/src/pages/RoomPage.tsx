import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { GameMode, BaseGameState } from "shared";
import type { Room } from "@colyseus/sdk";
import { useGame } from "../context/GameContext";
import { WaitingRoom } from "../lobby/WaitingRoom";
import { joinRoom } from "../network/client";

export const RoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { room, setRoom } = useGame();
  const [error, setError] = useState("");
  const joinedRef = useRef(false);

  const connected = room && room.roomId === id;

  useEffect(() => {
    if (connected || joinedRef.current || !id) return;
    joinedRef.current = true;

    setError("");
    joinRoom(id)
      .then((r) => {
        const mode: GameMode = r.name === "goals_room" ? "goals" : "classic";
        setRoom(r as Room<BaseGameState>, mode);

        if ((r.state as any)?.phase === "playing") {
          navigate(`/${id}/play`, { replace: true });
        }
      })
      .catch((err) => {
        joinedRef.current = false;
        setError(err.message || "Failed to join room");
      });
  }, [id]);

  const handleGameStart = () => {
    navigate(`/${id}/play`);
  };

  const handleLeave = () => {
    navigate("/");
  };

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="p-10 w-[400px] max-w-[90vw] text-center">
          <h2 className="m-0 mb-2">Can't Join Room</h2>
          <p className="text-red-500 text-sm mb-6">{error}</p>
          <button
            className="text-neutral-500 text-sm cursor-pointer bg-transparent border-none underline"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-text-muted">Joining room...</p>
      </div>
    );
  }

  return (
    <WaitingRoom room={room} onGameStart={handleGameStart} onLeave={handleLeave} />
  );
};
