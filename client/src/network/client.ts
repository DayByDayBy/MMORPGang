import { Client, Room } from "@colyseus/sdk";
import type { GameMode } from "shared";

export const SERVER_URL = import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? "http://localhost:2567" : window.location.origin);

let clientInstance: Client | null = null;

export function getClient(): Client {
  if (!clientInstance) {
    clientInstance = new Client(SERVER_URL);
  }
  return clientInstance;
}

export async function createRoom(mode: GameMode) {
  const client = getClient();
  const roomType = mode === "classic" ? "classic_room" : "goals_room";
  return client.create(roomType, {});
}

export async function joinRoom(roomId: string) {
  const client = getClient();
  return client.joinById(roomId, {});
}

export async function uploadPlayerAudio(room: Room, audio: string) {
  await fetch(`${SERVER_URL}/api/audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId: room.roomId, sessionId: room.sessionId, audio }),
  });
  room.send("audio_uploaded");
}
