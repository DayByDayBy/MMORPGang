import { useEffect, useRef, useState } from "react";
import { PLAYER_COLORS, PLAYER_BG_COLORS, MAX_PLAYERS } from "shared";
import type { BaseGameState } from "shared";
import type { Room } from "@colyseus/sdk";
import { uploadPlayerAudio } from "@/network/client";
import { Button } from "@/components/Button";
import { AudioRecorder } from "./components/AudioRecorder";

interface PlayerInfo {
  sessionId: string;
  name: string;
  colorIndex: number;
  ready: boolean;
}

interface WaitingRoomProps {
  room: Room<BaseGameState>;
  onGameStart: () => void;
  onLeave: () => void;
}

export const WaitingRoom = ({ room, onGameStart, onLeave }: WaitingRoomProps) => {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [myReady, setMyReady] = useState(false);
  const [editingName, setEditingName] = useState("");
  const nameCommittedRef = useRef(false);

  useEffect(() => {
    const sync = () => {
      if (!(room.state as any)?.players) return;

      const list: PlayerInfo[] = [];
      (room.state as any).players.forEach((p: any, key: string) => {
        list.push({
          sessionId: key,
          name: p.name,
          colorIndex: p.colorIndex ?? 0,
          ready: p.ready,
        });
      });
      setPlayers(list);

      const me = (room.state as any).players.get(room.sessionId);
      if (me) {
        setMyReady(me.ready);
        if (!nameCommittedRef.current) setEditingName(me.name);
      }

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

  const commitName = () => {
    const trimmed = editingName.trim();
    if (trimmed) {
      room.send("set_name", { name: trimmed });
      nameCommittedRef.current = true;
    }
  };

  const toggleReady = () => {
    commitName();
    room.send("player_ready");
  };

  const handleLeave = () => {
    room.leave();
    onLeave();
  };

  const myColorIndex = players.find((p) => p.sessionId === room.sessionId)?.colorIndex ?? 0;
  const bgColor = PLAYER_BG_COLORS[myColorIndex % PLAYER_BG_COLORS.length];

  return (
    <div
      className="flex items-center justify-center w-full h-full"
      style={{ backgroundColor: bgColor }}
    >
      <div className="p-10 w-[420px] max-w-[90vw] text-center">
        <h2 className="m-0 mb-2">Waiting for Players</h2>
        <p className="m-0 text-neutral-400">
          Room:{" "}
          <code className="bg-white/8 px-2.5 py-0.5 text-lg text-accent select-all">
            {room.roomId}
          </code>
        </p>
        <p className="text-text-dim text-[13px] mb-0">Share this ID with friends to join</p>
        <p className="mt-1 mb-0 text-accent text-sm font-semibold">
          {players.length} / {MAX_PLAYERS} players
        </p>

        <div className="my-5 p-4 bg-white/3 border border-border-subtle rounded-lg text-left">
          <label className="flex flex-col gap-2 text-neutral-400 text-sm">
            Your Name
            <input
              type="text"
              value={editingName}
              onChange={(e) => {
                setEditingName(e.target.value);
                nameCommittedRef.current = false;
              }}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); }}
              placeholder="Enter your name..."
              maxLength={16}
              className="px-3 py-2 border border-border bg-surface-elevated text-white text-base outline-none"
            />
          </label>

          <AudioRecorder
            onRecorded={(audio) => uploadPlayerAudio(room, audio)}
          />
        </div>

        <ul className="list-none p-0 my-4 flex flex-col gap-2.5">
          {players.map((p) => (
            <li
              key={p.sessionId}
              className="flex items-center gap-2.5 px-3 py-2 bg-white/3 border border-white/6"
            >
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: PLAYER_COLORS[p.colorIndex] }}
              />
              <span className="flex-1 text-left text-neutral-300">
                {p.name}
                {p.sessionId === room.sessionId ? " (you)" : ""}
              </span>
              <span className={`text-[13px] ${p.ready ? "text-green-500" : "text-neutral-500"}`}>
                {p.ready ? "Ready" : "Not ready"}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex gap-3 justify-center">
          <Button variant={myReady ? "warning" : "success"} onClick={toggleReady}>
            {myReady ? "Cancel Ready" : "Ready Up"}
          </Button>
          <Button variant="ghost" onClick={handleLeave}>
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
};
