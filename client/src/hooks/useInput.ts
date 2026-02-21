import { useEffect } from 'react'
import type { mmorpong } from 'shared'
import type { GameSocket } from '../socket'

const KEYS = new Set(['ArrowLeft', 'a', 'ArrowRight', 'd'])

export function useInput(socket: GameSocket | null) {
  useEffect(() => {
    if (!socket) return

    const input: mmorpong.PlayerInput = { left: false, right: false }

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
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
    }
  }, [socket])
}