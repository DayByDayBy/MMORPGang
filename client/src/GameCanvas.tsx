import { useEffect, useRef } from 'react'
import { Application, Container } from 'pixi.js'
import { io } from 'socket.io-client'
import { ARENA_RADIUS_RATIO, COLORS, getSlotAngles } from 'shared'
import type { BallState, GameState, PlayerState } from 'shared'
import { Arena } from './game/Arena'
import { Ball } from './game/Ball'
import { Goal } from './game/Goal'
import { Player } from './game/Player'

const W = window.innerWidth
const H = window.innerHeight
const CENTER_X = W / 2
const CENTER_Y = H / 2
const ARENA_RADIUS     = Math.min(W, H) * ARENA_RADIUS_RATIO
const GOAL_RADIUS      = ARENA_RADIUS * 0.05
const ORBIT_RADIUS     = ARENA_RADIUS * 0.15
const GOAL_RING_RADIUS = ARENA_RADIUS * 0.72

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
  x: CENTER_X, y: CENTER_Y,
  vx: 0,       vy: 0,
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
      new Arena(stage, CENTER_X, CENTER_Y, ARENA_RADIUS)

      // Players + Goals
      mockPlayers.forEach(p => {
        const goalX = CENTER_X + Math.cos(p.goalAngle) * GOAL_RING_RADIUS
        const goalY = CENTER_Y + Math.sin(p.goalAngle) * GOAL_RING_RADIUS

        const goal   = new Goal(stage)
        const player = new Player(stage)

        goal.render(p, goalX, goalY, GOAL_RADIUS)
        player.render(p, goalX, goalY, ORBIT_RADIUS)
      })

      // Ball
      const ball = new Ball(stage)
      ball.render(mockBall, ARENA_RADIUS * 0.015)
    })

    return () => {
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