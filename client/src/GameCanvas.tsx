import { useEffect, useRef } from 'react'
import { Application, Container } from 'pixi.js'
import {
  WORLD_SIZE, ARENA_RADIUS, GOAL_RING_RADIUS, GOAL_RADIUS,
  ORBIT_RADIUS, BALL_RADIUS, COLORS,
} from 'shared'
import type { GameState } from 'shared'
import { Arena } from './game/Arena'
import { Ball } from './game/Ball'
import { Goal } from './game/Goal'
import { Player } from './game/Player'
import { useInput } from './hooks/useInput'
import type { GameSocket } from './socket'

const W = window.innerWidth
const H = window.innerHeight
const CENTER_X = W / 2
const CENTER_Y = H / 2
const SCALE = Math.min(W, H) / WORLD_SIZE

const toScreen = (v: number) => v * SCALE
const wx = (x: number) => CENTER_X + x * SCALE
const wy = (y: number) => CENTER_Y + y * SCALE

interface GameCanvasProps {
  socket: GameSocket | null
}

export default function GameCanvas({ socket }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)

  useInput(socket)

  useEffect(() => {
    if (appRef.current || !socket) return

    const app = new Application()
    appRef.current = app

    let ballObj: Ball | null = null
    const playerObjs = new Map<string, { goal: Goal; player: Player }>()
    let onGameState: ((state: GameState) => void) | null = null

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

      new Arena(stage, CENTER_X, CENTER_Y, toScreen(ARENA_RADIUS))

      onGameState = (state: GameState) => {
        // Ball — create on first state
        if (!ballObj) ballObj = new Ball(stage)
        ballObj.render(
          { x: wx(state.ball.x), y: wy(state.ball.y), vx: state.ball.vx, vy: state.ball.vy },
          toScreen(BALL_RADIUS),
        )

        // Players + Goals — create / update / remove
        for (const [id, p] of Object.entries(state.players)) {
          const goalX = wx(Math.cos(p.goalAngle) * GOAL_RING_RADIUS)
          const goalY = wy(Math.sin(p.goalAngle) * GOAL_RING_RADIUS)

          if (!playerObjs.has(id)) {
            playerObjs.set(id, {
              goal:   new Goal(stage),
              player: new Player(stage),
            })
          }
          const objs = playerObjs.get(id)!
          objs.goal.render(p, goalX, goalY, toScreen(GOAL_RADIUS))
          objs.player.render(p, goalX, goalY, toScreen(ORBIT_RADIUS), id === socket.id)
        }

        // Remove disconnected players
        for (const id of playerObjs.keys()) {
          if (!state.players[id]) {
            const objs = playerObjs.get(id)!
            objs.goal.destroy()
            objs.player.destroy()
            playerObjs.delete(id)
          }
        }
      }

      socket.on('gameState', onGameState)
    })

    return () => {
      if (onGameState) socket.off('gameState', onGameState)
      for (const objs of playerObjs.values()) {
        objs.goal.destroy()
        objs.player.destroy()
      }
      playerObjs.clear()
      ballObj?.destroy()
      appRef.current = null
      app.destroy(true)
    }
  }, [socket])

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
    />
  )
}