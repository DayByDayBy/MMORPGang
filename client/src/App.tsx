import { useState, useCallback } from "react";
import type { GameMode, BaseGameState } from "shared";
import type { Room } from "@colyseus/sdk";
import { Lobby } from "./lobby/Lobby";
import { WaitingRoom } from "./lobby/WaitingRoom";
import { GameScene } from "./game/GameScene";
import { createRoom, joinRoom } from "./network/client";

type AppState =
  | { screen: "lobby" }
  | { screen: "local"; playerName: string; playerCount: number; gameMode: GameMode }
  | { screen: "waiting"; room: Room<BaseGameState>; gameMode: GameMode }
  | { screen: "online"; room: Room<BaseGameState>; gameMode: GameMode };

export const App = () => {
  const [state, setState] = useState<AppState>({ screen: "lobby" });
  const [error, setError] = useState("");

  const goLobby = useCallback(() => {
    if (state.screen === "waiting" || state.screen === "online") {
      state.room.leave();
    }
    setState({ screen: "lobby" });
    setError("");
  }, [state]);

  const handleStartLocal = (name: string, count: number, mode: GameMode) => {
    setState({ screen: "local", playerName: name, playerCount: count, gameMode: mode });
  };

  const handleCreateRoom = async (name: string, mode: GameMode) => {
    try {
      setError("");
      const room = await createRoom(name, mode);
      setState({ screen: "waiting", room: room as Room<BaseGameState>, gameMode: mode });
    } catch (e: any) {
      setError(e.message || "Failed to create room");
    }
  };

  const handleJoinRoom = async (name: string, roomId: string) => {
    try {
      setError("");
      const room = await joinRoom(roomId, name);
      const gameMode = ((room.state as any)?.mode as GameMode) || "classic";
      setState({ screen: "waiting", room: room as Room<BaseGameState>, gameMode });
    } catch (e: any) {
      setError(e.message || "Failed to join room");
    }
  };

  const handleGameStart = useCallback(() => {
    if (state.screen === "waiting") {
      setState({ screen: "online", room: state.room, gameMode: state.gameMode });
    }
  }, [state]);

  if (state.screen === "local") {
    return (
      <GameScene
        mode="local"
        gameMode={state.gameMode}
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
        gameMode={state.gameMode}
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
