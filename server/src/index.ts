import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { TICK_RATE } from 'shared'
import type { GameState } from 'shared'
import { Ball } from './game/Ball'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' }
})

let tick = 0
const ball = new Ball()

const state: GameState = {
  players: {},
  ball:    ball.getState(),
  tick:    0,
  phase:   'playing',
}

setInterval(() => {
  tick++
  ball.update()
  state.ball = ball.getState()
  state.tick = tick
  io.emit('gameState', state)
}, 1000 / TICK_RATE)

io.on('connection', (socket) => {
  console.log('client connected:', socket.id)
  socket.on('disconnect', () => console.log('client disconnected:', socket.id))
})

httpServer.listen(3001, () => console.log('server running on port 3001'))
