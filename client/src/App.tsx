import { useState, useCallback } from "react";
import type { Room } from "@colyseus/sdk";
import { Lobby } from "./lobby/Lobby";
import { WaitingRoom } from "./lobby/WaitingRoom";
import { GameScene } from "./game/GameScene";
import { createRoom, joinRoom } from "./network/client";

type AppState =
  | { screen: "lobby" }
  | { screen: "local"; playerName: string; playerCount: number }
  | { screen: "waiting"; room: Room }
  | { screen: "online"; room: Room };

export const App = () => {
  const [state, setState] = useState<AppState>({ screen: "lobby" });
  const [error, setError] = useState("");

  const goLobby = useCallback(() => {
    if (state.screen === "waiting" || state.screen === "online") {
      (state as any).room?.leave?.();
    }
    setState({ screen: "lobby" });
    setError("");
  }, [state]);

  const handleStartLocal = (name: string, count: number) => {
    setState({ screen: "local", playerName: name, playerCount: count });
  };

  const handleCreateRoom = async (name: string) => {
    try {
      setError("");
      const room = await createRoom(name);
      setState({ screen: "waiting", room });
    } catch (e: any) {
      setError(e.message || "Failed to create room");
    }
  };

  const handleJoinRoom = async (name: string, roomId: string) => {
    try {
      setError("");
      const room = await joinRoom(roomId, name);
      setState({ screen: "waiting", room });
    } catch (e: any) {
      setError(e.message || "Failed to join room");
    }
  };

  const handleGameStart = useCallback(() => {
    if (state.screen === "waiting") {
      setState({ screen: "online", room: state.room });
    }
  }, [state]);

  if (state.screen === "local") {
    return (
      <GameScene
        mode="local"
        playerCount={state.playerCount}
        playerName={state.playerName}
        onExit={goLobby}
      />
    );
  }

  if (state.screen === "waiting") {
    return (
      <WaitingRoom
        room={state.room}
        onGameStart={handleGameStart}
        onLeave={goLobby}
      />
    );
  }

  if (state.screen === "online") {
    return (
      <GameScene
        mode="online"
        room={state.room}
        onExit={goLobby}
      />
    );
  }

  return (
    <>
      <Lobby
        onStartLocal={handleStartLocal}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />
      {error && (
        <div style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#ff4136",
          color: "#fff",
          padding: "8px 20px",
          fontSize: 14,
        }}>
          {error}
        </div>
      )}
    </>
  );
};
