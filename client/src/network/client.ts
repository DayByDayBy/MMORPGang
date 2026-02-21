import { Client } from "@colyseus/sdk";

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:2567";
const COLYSEUS_URL = SERVER_URL;

let clientInstance: Client | null = null;

export function getClient(): Client {
  if (!clientInstance) {
    clientInstance = new Client(COLYSEUS_URL);
  }
  return clientInstance;
}

export async function createRoom(name: string) {
  const client = getClient();
  return client.create("game_room", { name });
}

export async function joinRoom(roomId: string, name: string) {
  const client = getClient();
  return client.joinById(roomId, { name });
}
