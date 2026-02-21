import { useEffect, useRef } from 'react'
import { Application, Container } from 'pixi.js'
import { mmorpong } from 'shared'
import type { GameSocket } from './socket'
import { Arena } from './game/Arena'
import { Ball } from './game/Ball'
import { Goal } from './game/Goal'
import { Player } from './game/Player'
import { useInput } from './hooks/useInput'

const W = window.innerWidth
const H = window.innerHeight
const CENTER_X = W / 2
const CENTER_Y = H / 2
const SCALE = Math.min(W, H) / mmorpong.WORLD_SIZE

const toScreen = (v: number) => v * SCALE
const wx = (x: number) => CENTER_X + x * SCALE
const wy = (y: number) => CENTER_Y + y * SCALE

interface GameCanvasProps {
  socket: GameSocket | null
}

export default function GameCanvas({ socket }: GameCanvasProps) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const appRef         = useRef<Application | null>(null)
  const ballRef        = useRef<Ball | null>(null)
  const playerObjsRef  = useRef<Map<string, { goal: Goal; player: Player }>>(new Map())
  const onGameStateRef = useRef<((state: mmorpong.GameState) => void) | null>(null)

  useInput(socket)

  useEffect(() => {
    if (appRef.current || !socket) return

    const app = new Application()
    appRef.current = app

    app.init({
      width:           W,
      height:          H,
      backgroundColor: mmorpong.COLORS.background,
      antialias:       true,
    }).then(() => {
      if (!containerRef.current) return
      containerRef.current.appendChild(app.canvas)

      const stage = new Container()
      app.stage.addChild(stage)

      new Arena(stage, CENTER_X, CENTER_Y, toScreen(mmorpong.ARENA_RADIUS))

      onGameStateRef.current = (state: mmorpong.GameState) => {
        if (!ballRef.current) ballRef.current = new Ball(stage)
        ballRef.current.render(
          { x: wx(state.ball.x), y: wy(state.ball.y), vx: state.ball.vx, vy: state.ball.vy },
          toScreen(mmorpong.BALL_RADIUS),
        )

        const playerObjs = playerObjsRef.current
        for (const [id, p] of Object.entries(state.players)) {
          const goalX = wx(Math.cos(p.goalAngle) * mmorpong.GOAL_RING_RADIUS)
          const goalY = wy(Math.sin(p.goalAngle) * mmorpong.GOAL_RING_RADIUS)

          if (!playerObjs.has(id)) {
            playerObjs.set(id, {
              goal:   new Goal(stage),
              player: new Player(stage),
            })
          }
          const objs = playerObjs.get(id)!
          objs.goal.render(p, goalX, goalY, toScreen(mmorpong.GOAL_RADIUS))
          objs.player.render(p, goalX, goalY, toScreen(mmorpong.ORBIT_RADIUS), id === socket.id)
        }

        for (const id of playerObjs.keys()) {
          if (!state.players[id]) {
            const objs = playerObjs.get(id)!
            objs.goal.destroy()
            objs.player.destroy()
            playerObjs.delete(id)
          }
        }
      }

      socket.on('gameState', onGameStateRef.current)
    })

    return () => {
      if (onGameStateRef.current) socket.off('gameState', onGameStateRef.current)
      for (const objs of playerObjsRef.current.values()) {
        objs.goal.destroy()
        objs.player.destroy()
      }
      playerObjsRef.current.clear()
      ballRef.current?.destroy()
      ballRef.current = null
      onGameStateRef.current = null
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