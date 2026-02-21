import { useState } from "react";
import { MIN_PLAYERS, MAX_PLAYERS, PLAYER_COLORS } from "shared";
import "./Lobby.css";

interface LobbyProps {
  onStartLocal: (name: string, playerCount: number) => void;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (name: string, roomId: string) => void;
}

export const Lobby = ({ onStartLocal, onCreateRoom, onJoinRoom }: LobbyProps) => {
  const [name, setName] = useState("");
  const [playerCount, setPlayerCount] = useState(4);
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");

  const valid = name.trim().length > 0;

  const handleLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (valid) onStartLocal(name.trim(), playerCount);
  };

  const handleCreate = () => {
    if (!valid) return;
    setError("");
    onCreateRoom(name.trim());
  };

  const handleJoin = () => {
    if (!valid || !roomId.trim()) {
      setError("Enter your name and a room ID");
      return;
    }
    setError("");
    onJoinRoom(name.trim(), roomId.trim());
  };

  return (
    <div className="lobby">
      <div className="lobby__card">
        <h1 className="lobby__title">PONG ARENA</h1>
        <p className="lobby__subtitle">Multiplayer polygon pong</p>

        <form onSubmit={handleLocal} className="lobby__form">
          <label className="lobby__label">
            Your Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              maxLength={16}
              className="lobby__input"
              autoFocus
            />
          </label>

          <label className="lobby__label">
            Players (local): {playerCount}
            <input
              type="range"
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
              className="lobby__slider"
            />
            <div className="lobby__slider-labels">
              <span>{MIN_PLAYERS}</span>
              <span>{MAX_PLAYERS}</span>
            </div>
          </label>

          <div className="lobby__preview">
            {Array.from({ length: playerCount }, (_, i) => (
              <div
                key={i}
                className="lobby__dot"
                style={{ backgroundColor: PLAYER_COLORS[i] }}
                title={`Player ${i + 1}`}
              />
            ))}
          </div>

          <button type="submit" disabled={!valid} className="lobby__button">
            Start Local Game
          </button>

          <div className="lobby__divider">
            <span>or play online</span>
          </div>

          <button
            type="button"
            disabled={!valid}
            className="lobby__button lobby__button--online"
            onClick={handleCreate}
          >
            Create Online Room
          </button>
          <p className="lobby__online-hint">Up to {MAX_PLAYERS} players — arena adapts to whoever joins</p>

          <div className="lobby__join-row">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Room ID..."
              className="lobby__input lobby__input--room"
            />
            <button
              type="button"
              disabled={!valid || !roomId.trim()}
              className="lobby__button lobby__button--join"
              onClick={handleJoin}
            >
              Join
            </button>
          </div>

          {error && <p className="lobby__error">{error}</p>}
        </form>
      </div>
    </div>
  );
};
