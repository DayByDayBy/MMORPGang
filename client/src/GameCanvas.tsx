import { useEffect, useRef } from 'react'
import { Application, Graphics } from 'pixi.js'
import { ARENA_RADIUS, COLORS } from 'shared'


const W = window.innerWidth
const H = window.innerHeight
const CANVAS_SIZE_X = W
const CANVAS_SIZE_Y = H
const CENTER_X = W / 2
const CENTER_Y = H / 2
const ARENA_RADIUS = Math.min(W, H) * 0.45 



export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)

  useEffect(() => {
    if (appRef.current) return  // already initialized

    const app = new Application()
    appRef.current = app

    app.init({
      width: CANVAS_SIZE_X,
      height: CANVAS_SIZE_Y,
      backgroundColor: COLORS.background,
      antialias: true,
    }).then(() => {
      if (!containerRef.current) return

      containerRef.current.appendChild(app.canvas)

      const g = new Graphics()
      g.circle(CANVAS_SIZE_X / 2, CANVAS_SIZE_Y / 2, ARENA_RADIUS)
      g.stroke({ width: 2, color: COLORS.cyan, alpha: 0.4 })
      app.stage.addChild(g)
    })

    return () => {
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