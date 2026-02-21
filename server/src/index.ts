import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { TICK_RATE } from 'shared'
import type { GameState } from 'shared'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' }
})

let tick = 0

const state: GameState = {
  players: {},
  ball:    { x: 0, y: 0, vx: 0, vy: 0 },
  tick:    0,
  phase:   'lobby',
}

setInterval(() => {
  tick++
  state.tick = tick
  io.emit('gameState', state)
}, 1000 / TICK_RATE)

io.on('connection', (socket) => {
  console.log('client connected:', socket.id)
  socket.on('disconnect', () => console.log('client disconnected:', socket.id))
})

httpServer.listen(3001, () => console.log('server running on port 3001'))
