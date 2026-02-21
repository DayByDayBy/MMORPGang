import { useEffect, useRef } from 'react'
import { Application, Container } from 'pixi.js'
import { io } from 'socket.io-client'
import {
  WORLD_SIZE, ARENA_RADIUS, GOAL_RING_RADIUS, GOAL_RADIUS,
  ORBIT_RADIUS, COLORS, getSlotAngles,
} from 'shared'
import type { BallState, GameState, PlayerState } from 'shared'
import { Arena } from './game/Arena'
import { Ball } from './game/Ball'
import { Goal } from './game/Goal'
import { Player } from './game/Player'

const W = window.innerWidth
const H = window.innerHeight
const CENTER_X = W / 2
const CENTER_Y = H / 2
// Single scale factor: world (0,0)-centred coords → screen pixels
const SCALE = Math.min(W, H) / WORLD_SIZE

const toScreen = (v: number) => v * SCALE
const wx = (x: number) => CENTER_X + x * SCALE
const wy = (y: number) => CENTER_Y + y * SCALE

// ─── placeholder state (layout verification, etc) ──────────────────────────────────────
const PLAYER_COUNT = 6
const slotAngles = getSlotAngles(PLAYER_COUNT)

const mockPlayers: PlayerState[] = slotAngles.map((goalAngle, i) => ({
  id:        String(i),
  angle:     goalAngle,         // paddle starts pointing outward
  goalAngle,
  paddleArc: Math.PI / 6,       // 30 degrees
  lives:     5,
  score:     0,
  connected: true,
}))

const mockBall: BallState = {
  x: 0, y: 0,
  vx: 0, vy: 0,
}

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)

  useEffect(() => {
    if (appRef.current) return

    const socket = io('http://localhost:3001')
    socket.on('gameState', (state: GameState) => {
      console.log('tick', state.tick)
    })

    const input = { left: false, right: false }
    const KEYS = new Set(['ArrowLeft', 'a', 'ArrowRight', 'd'])
    const onKeyDown = (e: KeyboardEvent) => {
      if (!KEYS.has(e.key) || e.repeat) return
      const prev = { ...input }
      if (e.key === 'ArrowLeft'  || e.key === 'a') input.left  = true
      if (e.key === 'ArrowRight' || e.key === 'd') input.right = true
      if (input.left !== prev.left || input.right !== prev.right)
        socket.emit('playerInput', { ...input })
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (!KEYS.has(e.key)) return
      const prev = { ...input }
      if (e.key === 'ArrowLeft'  || e.key === 'a') input.left  = false
      if (e.key === 'ArrowRight' || e.key === 'd') input.right = false
      if (input.left !== prev.left || input.right !== prev.right)
        socket.emit('playerInput', { ...input })
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    const app = new Application()
    appRef.current = app

    app.init({
      width:           W,
      height:          H,
      backgroundColor: COLORS.background,
      antialias:       true,
    }).then(() => {
      if (!containerRef.current) return
      containerRef.current.appendChild(app.canvas)

      const stage = new Container()
      app.stage.addChild(stage)

      // Arena
      new Arena(stage, CENTER_X, CENTER_Y, toScreen(ARENA_RADIUS))

      // Players + Goals
      mockPlayers.forEach(p => {
        const goalX = wx(Math.cos(p.goalAngle) * GOAL_RING_RADIUS)
        const goalY = wy(Math.sin(p.goalAngle) * GOAL_RING_RADIUS)

        const goal   = new Goal(stage)
        const player = new Player(stage)

        goal.render(p, goalX, goalY, toScreen(GOAL_RADIUS))
        player.render(p, goalX, goalY, toScreen(ORBIT_RADIUS))
      })

      // Ball
      const ball = new Ball(stage)
      ball.render(mockBall, toScreen(ARENA_RADIUS * 0.025))
    })

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      socket.disconnect()
      appRef.current = null
      app.destroy(true)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
    />
  )
}