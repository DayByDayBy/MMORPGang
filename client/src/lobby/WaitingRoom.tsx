import { useEffect, useState } from "react";
import { PLAYER_COLORS } from "shared";
import type { Room } from "@colyseus/sdk";
import "./WaitingRoom.css";

interface PlayerInfo {
  sessionId: string;
  name: string;
  colorIndex: number;
  ready: boolean;
}

interface WaitingRoomProps {
  room: Room;
  onGameStart: () => void;
  onLeave: () => void;
}

export const WaitingRoom = ({ room, onGameStart, onLeave }: WaitingRoomProps) => {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [myReady, setMyReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (!room.state?.players) return;

      const list: PlayerInfo[] = [];
      room.state.players.forEach((p: any, key: string) => {
        list.push({
          sessionId: key,
          name: p.name,
          colorIndex: p.colorIndex,
          ready: p.ready,
        });
      });
      setPlayers(list);

      const me = room.state.players.get(room.sessionId);
      if (me) setMyReady(me.ready);

      if (room.state.phase === "playing") {
        onGameStart();
      }
    };

    room.onStateChange(sync);
    room.onMessage("game_over", () => {});

    return () => {
      room.removeAllListeners();
    };
  }, [room, onGameStart]);

  const toggleReady = () => {
    room.send("player_ready");
  };

  const handleLeave = () => {
    room.leave();
    onLeave();
  };

  return (
    <div className="waiting">
      <div className="waiting__card">
        <h2 className="waiting__title">Waiting for Players</h2>
        <p className="waiting__room-id">
          Room ID: <code className="waiting__code">{room.roomId}</code>
        </p>
        <p className="waiting__hint">Share this ID with friends to join</p>

        <ul className="waiting__players">
          {players.map((p) => (
            <li key={p.sessionId} className="waiting__player">
              <div
                className="waiting__dot"
                style={{ backgroundColor: PLAYER_COLORS[p.colorIndex] }}
              />
              <span className="waiting__name">
                {p.name}
                {p.sessionId === room.sessionId ? " (you)" : ""}
              </span>
              <span className={`waiting__status ${p.ready ? "waiting__status--ready" : ""}`}>
                {p.ready ? "Ready" : "Not ready"}
              </span>
            </li>
          ))}
        </ul>

        <div className="waiting__actions">
          <button
            className={`waiting__btn ${myReady ? "waiting__btn--unready" : "waiting__btn--ready"}`}
            onClick={toggleReady}
          >
            {myReady ? "Cancel Ready" : "Ready Up"}
          </button>
          <button className="waiting__btn waiting__btn--leave" onClick={handleLeave}>
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};
