import { Client } from "@colyseus/sdk";
import type { GameMode } from "shared";

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:2567";
const COLYSEUS_URL = SERVER_URL;

let clientInstance: Client | null = null;

export function getClient(): Client {
  if (!clientInstance) {
    clientInstance = new Client(COLYSEUS_URL);
  }
  return clientInstance;
}

export async function createRoom(name: string, mode: GameMode) {
  const client = getClient();
  const roomType = mode === "classic" ? "classic_room" : "goals_room";
  return client.create(roomType, { name });
}

export async function joinRoom(roomId: string, name: string) {
  const client = getClient();
  return client.joinById(roomId, { name });
}
