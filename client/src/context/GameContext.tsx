import { createContext, useContext, useState, type ReactNode } from "react";
import type { GameMode, BaseGameState } from "shared";
import type { Room } from "@colyseus/sdk";

interface LocalGameState {
  playerName: string;
  playerCount: number;
  gameMode: GameMode;
}

interface GameContextValue {
  room: Room<BaseGameState> | null;
  gameMode: GameMode;
  localState: LocalGameState | null;
  error: string;
  setRoom: (room: Room<BaseGameState>, mode: GameMode) => void;
  setLocalState: (state: LocalGameState) => void;
  setError: (error: string) => void;
  clearAll: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [room, setRoomState] = useState<Room<BaseGameState> | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [localState, setLocalStateValue] = useState<LocalGameState | null>(null);
  const [error, setError] = useState("");

  const setRoom = (r: Room<BaseGameState>, mode: GameMode) => {
    setRoomState(r);
    setGameMode(mode);
    setError("");
  };

  const setLocalState = (s: LocalGameState) => {
    setLocalStateValue(s);
    setGameMode(s.gameMode);
    setError("");
  };

  const clearAll = () => {
    if (room) room.leave();
    setRoomState(null);
    setLocalStateValue(null);
    setError("");
  };

  return (
    <GameContext.Provider
      value={{ room, gameMode, localState, error, setRoom, setLocalState, setError, clearAll }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
