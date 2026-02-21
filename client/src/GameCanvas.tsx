import { useEffect, useRef } from 'react'
import { Application, Graphics } from 'pixi.js'
import { ARENA_RADIUS } from 'shared'

const CANVAS_SIZE = 1920

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const app = new Application()

    app.init({
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: 0x03020a,
      antialias: true,
      resizeTo: containerRef.current!,
    }).then(() => {
      containerRef.current!.appendChild(app.canvas)

      // Draw arena circle
      const g = new Graphics()
      g.circle(CANVAS_SIZE / 2, CANVAS_SIZE / 2, ARENA_RADIUS)
      g.stroke({ width: 2, color: 0x00ffe7, alpha: 0.4 })
      app.stage.addChild(g)
    })

    return () => {
      app.destroy(true)
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />
}
