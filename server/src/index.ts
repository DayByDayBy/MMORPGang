import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { TICK_RATE } from 'shared'
import { Ball } from './game/Ball'
import { GameStateManager } from './game/GameState'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' }
})

let tick = 0
const ball = new Ball()
const gsm  = new GameStateManager()

setInterval(() => {
  tick++
  gsm.applyInputs()
  ball.update()
  io.emit('gameState', gsm.getState(ball.getState(), tick))
}, 1000 / TICK_RATE)

io.on('connection', (socket) => {
  console.log('client connected:', socket.id)
  gsm.addPlayer(socket.id)
  socket.on('playerInput', (input) => gsm.setInput(socket.id, input))
  socket.on('disconnect', () => {
    console.log('client disconnected:', socket.id)
    gsm.removePlayer(socket.id)
  })
})

httpServer.listen(3001, () => console.log('server running on port 3001'))
