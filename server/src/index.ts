import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { TICK_RATE, GOAL_RING_RADIUS } from 'shared'
import type { ClientToServerEvents, ServerToClientEvents } from 'shared'
import { Ball } from './game/Ball'
import { GameStateManager } from './game/GameState'
import { checkPaddleCollision, checkGoalCollision } from './game/Physics'

const DT = 1 / TICK_RATE  // seconds per tick

const app = express()
const httpServer = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' }
})

let tick = 0
const ball = new Ball()
const gsm  = new GameStateManager()

setInterval(() => {
  tick++
  if (gsm.getPhase() === 'playing') {
    gsm.applyInputs()
    ball.update(DT)
    const ballState = ball.getState()
    for (const player of Object.values(gsm.getPlayers())) {
      const goalX = Math.cos(player.goalAngle) * GOAL_RING_RADIUS
      const goalY = Math.sin(player.goalAngle) * GOAL_RING_RADIUS
      const saved = checkPaddleCollision(ballState, player, goalX, goalY)
      if (!saved) checkGoalCollision(ballState, player, goalX, goalY)
    }
  }
  io.emit('gameState', gsm.getState(ball.getState(), tick))
}, 1000 / TICK_RATE)

io.on('connection', (socket) => {
  console.log('client connected:', socket.id)
  gsm.addPlayer(socket.id)
  io.emit('lobbyState', gsm.getLobbyState())
  socket.on('playerInput', (input) => {
    if (
      typeof input !== 'object' || input === null ||
      typeof input.left  !== 'boolean' ||
      typeof input.right !== 'boolean' ||
      Object.keys(input).length > 2
    ) {
      console.warn('invalid playerInput from', socket.id, input)
      return
    }
    gsm.setInput(socket.id, { left: input.left, right: input.right })
  })
  socket.on('joinGame', (name) => {
    const trimmed = (name ?? '').trim()
    if (!trimmed) return
    gsm.setPlayerName(socket.id, trimmed.slice(0, 24))
    io.emit('lobbyState', gsm.getLobbyState())
  })
  socket.on('startGame', () => {
    if (gsm.getLobbyState().players.length < 2) return
    gsm.setPhase('playing')
  })
  socket.on('disconnect', () => {
    console.log('client disconnected:', socket.id)
    gsm.removePlayer(socket.id)
    io.emit('lobbyState', gsm.getLobbyState())
  })
})

httpServer.listen(3001, () => console.log('server running on port 3001'))
