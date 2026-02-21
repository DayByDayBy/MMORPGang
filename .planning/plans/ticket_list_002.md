
---

**TICKET N-01: Install and type socket.io-client**
*~15 mins*

```bash
cd client && pnpm add socket.io-client
```

Then add typed socket event interfaces to `shared/src/index.ts`:

```ts
export interface ServerToClientEvents {
  gameState: (state: GameState) => void
}

export interface ClientToServerEvents {
  playerInput: (input: PlayerInput) => void
  joinGame:    (name: string) => void
}
```

Update the server `index.ts` to use these types:
```ts
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, ...)
```

Done when: TypeScript is happy with socket event names on both sides.

---

**TICKET N-02: Wire GameCanvas to render real server state**
*~45 mins*

`GameCanvas.tsx` already receives `gameState` events but only `console.log`s them. This ticket wires it to actually render.

The approach: store game objects in refs so the render loop can access them, and update them from the socket event.

```tsx
const playersRef = useRef<Map<string, { goal: Goal, player: Player }>>(new Map())
const ballRef    = useRef<Ball | null>(null)

socket.on('gameState', (state: GameState) => {
  // update ball — create on first state received
  if (!ballRef.current) ballRef.current = new Ball(stage)
  ballRef.current.render(state.ball, toScreen(BALL_RADIUS))

  // update or create players
  for (const [id, p] of Object.entries(state.players)) {
    const goalX = wx(Math.cos(p.goalAngle) * GOAL_RING_RADIUS)
    const goalY = wy(Math.sin(p.goalAngle) * GOAL_RING_RADIUS)

    if (!playersRef.current.has(id)) {
      // new player - create render objects
      playersRef.current.set(id, {
        goal:   new Goal(stage),
        player: new Player(stage),
      })
    }
    const objs = playersRef.current.get(id)!
    objs.goal.render(p, goalX, goalY, toScreen(GOAL_RADIUS))
    objs.player.render(p, goalX, goalY, toScreen(ORBIT_RADIUS))
  }

  // remove disconnected players
  for (const id of playersRef.current.keys()) {
    if (!state.players[id]) {
      // destroy graphics, remove from map
      playersRef.current.delete(id)
    }
  }
})
```

Remove all mock state. Remove the `PLAYER_COUNT` and `mockPlayers` and `mockBall` blocks entirely.

Done when: opening two browser tabs shows two paddles moving independently, ball moving on screen.

---

**TICKET N-03: Handle player disconnect cleanup in renderer**
*~20 mins*

Extend the Goal and Player classes to support `destroy()`:

```ts
// in Goal.ts and Player.ts
destroy() {
  this.gfx.destroy()
}
```

Then call it in the cleanup path in N-02 when removing disconnected players. Also call `socket.disconnect()` and destroy all render objects in the `useEffect` cleanup return.

Done when: closing a tab removes that player from other clients' screens cleanly.

---

**TICKET N-04: Highlight local player**
*~20 mins, stretch*

The client knows its own socket id from `socket.id`. Pass it into the render loop and give the local player a distinct visual - brighter arc, different color, slightly thicker stroke.

```ts
// Player.ts - add isLocal param
render(state: PlayerState, goalX: number, goalY: number, orbitRadius: number, isLocal: boolean) {
  const color = isLocal ? 0xffffff : COLORS.cyan
  const width = isLocal ? 8 : 6
  ...
}
```

Done when: your own paddle is visually distinct from opponents.

---



---

**TICKET L-01: Capture and send keyboard input**
*~20 mins*

This is already in `GameCanvas.tsx` but needs to be extracted into its own hook for cleanliness:

Create `client/src/hooks/useInput.ts`:

```ts
import { useEffect } from 'react'
import { Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from 'shared'

export function useInput(socket: Socket<ServerToClientEvents, ClientToServerEvents>) {
  useEffect(() => {
    const input = { left: false, right: false }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft'  || e.key === 'a') input.left  = true
      if (e.key === 'ArrowRight' || e.key === 'd') input.right = true
      socket.emit('playerInput', { ...input })
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft'  || e.key === 'a') input.left  = false
      if (e.key === 'ArrowRight' || e.key === 'd') input.right = false
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
```

Done when: hook is imported and used in `GameCanvas.tsx`, old inline listeners removed.

---

**TICKET L-02: Lobby screen component**
*~45 mins*

Create `client/src/Lobby.tsx`. This is the screen shown before the game starts. It needs:

- A name input field
- A "Join Game" button
- A list of connected players (received from server)
- A "Start Game" button (shown when ≥2 players connected)

```tsx
export default function Lobby({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('')
  const trimmed = name.trim()
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>MMORPonG</h1>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="enter your name"
        style={styles.input}
      />
      <button
        onClick={() => { if (trimmed) onJoin(trimmed) }}
        disabled={!trimmed}
        style={styles.button}
      >
        JOIN
      </button>
    </div>
  )
}
```

Style it to match the game aesthetic - `#03020a` background, `#00ffe7` text, monospace font, minimal. No external CSS libraries, just inline styles.

Done when: lobby renders, name can be entered, join button calls `onJoin`.

---

**TICKET L-03: App-level game phase routing**
*~30 mins*

Update `App.tsx` to manage which screen is shown based on game phase:

```tsx
type AppPhase = 'lobby' | 'playing'

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('lobby')
  const [playerName, setPlayerName] = useState('')

  const handleJoin = (name: string) => {
    setPlayerName(name)
    setPhase('playing')
  }

  if (phase === 'lobby') return <Lobby onJoin={handleJoin} />
  return <GameCanvas playerName={playerName} />
}
```

Pass `playerName` into `GameCanvas` as a prop. Inside `GameCanvas`, emit `joinGame` once the socket connects:

```tsx
// in GameCanvas, after socket = io(...)
socket.on('connect', () => {
  socket.emit('joinGame', playerName)
})
```

This ensures the event fires even if the socket was already connected before the component mounts.

Done when: app starts on lobby, joining transitions to game canvas.

---

**TICKET L-04: Connected players list in lobby**
*~30 mins, stretch*

Add a `ServerToClientEvents` event for lobby state:

```ts
// in shared
export interface LobbyState {
  players: { id: string, name: string }[]
}

// add to ServerToClientEvents
lobbyState: (state: LobbyState) => void

// add to ClientToServerEvents
startGame: () => void
```

Server emits this on every join/leave. Lobby component subscribes and shows the list. Show player count and a "waiting for players..." message if under 2.

Done when: two tabs show each other's names in the lobby list.

---

**TICKET L-05: Start game trigger**
*~20 mins, stretch*

Add a "START" button to the lobby visible when ≥2 players are present. Clicking it emits `startGame` (typed in `ClientToServerEvents`) to the server. Server transitions `GameState.phase` from `'lobby'` to `'playing'` and begins the tick loop. All clients listening to `gameState` with `phase === 'playing'` transition to the game canvas automatically.

Done when: host can start the game from the lobby and all connected clients transition simultaneously.

