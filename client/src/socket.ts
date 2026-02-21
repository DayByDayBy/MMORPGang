import type { Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from 'shared'

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>
