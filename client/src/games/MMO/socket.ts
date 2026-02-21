import type { Socket } from 'socket.io-client'
import type { mmorpong } from 'shared'

export type GameSocket = Socket<mmorpong.ServerToClientEvents, mmorpong.ClientToServerEvents>