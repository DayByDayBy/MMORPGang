# Pixi MMO Pong

A multiplayer pong-like game where up to 12 players compete in a polygon-shaped arena. Built with Pixi.js for rendering, React for the lobby UI, and Colyseus for authoritative multiplayer networking.

## Concept

Players join a lobby via a shareable room code. When everyone is ready, the game starts. The arena is a regular polygon — one edge per player. Each player controls a paddle that slides along their assigned edge. The ball bounces around the arena; if it passes through your unguarded edge, you lose a life. Last player standing wins.

Each player is assigned a distinct color so paddles, edges, and scores are immediately recognizable.

## Game Modes

### Mode 1: Polygon Arena (MVP)

The arena is a regular N-sided polygon (N = number of players). 2 players = classic rectangle, 6 = hexagon, 12 = dodecagon. Clean geometry, predictable physics, difficulty scales naturally with player count.

### Mode 2: Chaos Mode (post-MVP)

Goals are placed at random positions. The ball wraps around screen edges (toroidal topology). Paddles float freely near their goals. Harder to read visually, but a fun party mode.

## Architecture

### Client

- **React** — lobby UI, matchmaking, settings screens
- **Pixi.js v8** — game canvas, rendering paddles/ball/arena
- **@colyseus/sdk** — client SDK for connecting to game rooms
- **Vite** — build tool and dev server
- **TypeScript** throughout

### Server

- **Node.js** — runtime
- **Colyseus** — authoritative multiplayer game framework
  - Room-based architecture (lobbies = rooms)
  - `@colyseus/schema` for automatic delta-compressed state sync
  - Built-in `setSimulationInterval` for the 30Hz game loop
  - Built-in matchmaking, reconnection, seat reservation
- **Server-authoritative** — the server runs the game simulation (ball physics, collision detection, scoring) and Colyseus automatically syncs state to clients

### Why Colyseus?

| Feature | Raw WebSockets (DIY) | Colyseus (built-in) |
|---|---|---|
| Room/lobby management | Build from scratch | First-class `Room` class with lifecycle hooks |
| State synchronization | Manually serialize + broadcast every tick | `@colyseus/schema` — automatic delta-compressed patches |
| Game loop | Manual `setInterval` | `setSimulationInterval(cb, ms)` |
| Matchmaking | Build from scratch | Built-in lobby + matchmaking |
| Reconnection | Handle manually | Built-in `allowReconnection` with seat reservation |
| Client SDK | Custom protocol | `@colyseus/sdk` with state change callbacks |

### Why not WebRTC?

WebRTC mesh networking at 12 peers (66 connections) is a nightmare of NAT traversal, STUN/TURN servers, and connection management. A server-authoritative WebSocket model is simpler, more reliable, prevents cheating, and easily handles 12 players per lobby.

## Project Structure

```
pixi-mmo-pong/
├── client/                     # Vite + React + Pixi.js
│   ├── src/
│   │   ├── main.tsx            # React entry
│   │   ├── App.tsx             # Router: lobby vs game
│   │   ├── lobby/
│   │   │   └── Lobby.tsx       # Lobby UI (create/join, player list)
│   │   ├── game/
│   │   │   ├── Game.ts         # Pixi Application, game loop
│   │   │   ├── Arena.ts        # Polygon rendering (uses shared geometry)
│   │   │   ├── Paddle.ts       # Paddle entity
│   │   │   ├── Ball.ts         # Ball entity
│   │   │   └── GameScene.tsx   # React wrapper that mounts Pixi
│   │   └── network/
│   │       └── client.ts       # Colyseus client (create/join rooms)
│   └── package.json
├── server/                     # Colyseus game server
│   ├── src/
│   │   ├── main.ts             # defineServer entry point
│   │   └── rooms/
│   │       └── GameRoom.ts     # Room class (lifecycle + physics + game loop)
│   └── package.json
├── shared/                     # Shared code (client + server)
│   ├── src/
│   │   ├── schema.ts           # @colyseus/schema state definitions
│   │   ├── types.ts            # Vector2, Edge interfaces
│   │   ├── geometry.ts         # Polygon vertex/edge computation
│   │   └── constants.ts        # Game tuning constants + color palette
│   └── package.json
└── package.json                # Workspace root (npm workspaces)
```

## Development Phases

### Phase 1: Local Prototype (no networking)

- [x] Project scaffolding (Vite + React + Pixi.js + Colyseus server)
- [x] Colyseus server with GameRoom, schema, and server-side physics
- [ ] Lobby screen — enter name, pick player count, start game
- [ ] Arena rendering — regular N-sided polygon with colored edges
- [ ] Paddle — slides along assigned edge, keyboard controlled
- [ ] Ball physics — movement, reflection off paddles, scoring through unguarded edges
- [ ] Scoring — lose a life when scored on, last player standing wins

### Phase 2: Multiplayer

- [ ] Connect lobby UI to Colyseus (create/join rooms by code)
- [ ] Player list with colors, ready-up button synced via schema state
- [ ] Client sends paddle input via `room.send("paddle_input", ...)`
- [ ] Client renders from Colyseus state callbacks (`onChange`, `onAdd`, `onRemove`)
- [ ] Client-side interpolation for smooth rendering between server ticks

### Phase 3: Polish

- [ ] Distinct 12-color palette with good contrast
- [ ] Elimination — scored-out player's edge becomes a wall
- [ ] Spectator mode for eliminated players
- [ ] Reconnection support via Colyseus `allowReconnection`
- [ ] Deploy: server on Fly.io/Railway, client on Vercel

### Phase 4: Fun Features

- [ ] Custom pong sounds via MediaRecorder API
- [ ] Mode 2: Chaos mode (random goals, toroidal wrapping)
- [ ] Power-ups, multiple balls, speed increases

## Technical Notes

### Colyseus State Schema

The game state is defined using `@colyseus/schema` decorators in `shared/src/schema.ts`:

```typescript
class GameRoomState extends Schema {
  @type("string") phase: string;          // "waiting" | "playing" | "ended"
  @type({ map: PlayerSchema }) players;   // keyed by sessionId
  @type(BallSchema) ball;                 // position + velocity
  @type("float32") arenaRadius;
  @type("uint8") numSides;
}
```

Colyseus automatically detects mutations and sends only the deltas to each client. The client SDK fires callbacks (`onChange`, `onAdd`, `onRemove`) so you can update the Pixi.js rendering in response.

### Polygon Math

For N players, vertices of a regular N-gon centered at origin with radius `r`:

```typescript
const vertices = Array.from({ length: n }, (_, i) => ({
  x: r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
  y: r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
}));
```

Each edge is `vertices[i]` → `vertices[(i+1) % n]`, assigned to player `i`. This geometry is computed in `shared/src/geometry.ts` and used by both server (collision detection) and client (rendering).

### Ball Reflection

Standard 2D reflection off a line segment: `v' = v - 2(v · n̂)n̂` where `n̂` is the edge's outward normal.

### Networking Model

Server simulates at 30Hz via `setSimulationInterval`. Colyseus patches state to clients automatically at each patch interval. Client renders at 60fps, interpolating between server snapshots. Clients send only their paddle input (position along their edge, 0.0–1.0). No client-side prediction needed for MVP — pong paddle input is simple enough.

### Custom Audio (Phase 4)

- `navigator.mediaDevices.getUserMedia({ audio: true })` to capture mic
- `MediaRecorder` to record a ≤1s clip as webm/opus
- Send blob to server via `room.send()`, server broadcasts to all peers
- Play back via `AudioContext` on paddle collision events

## Getting Started

```bash
npm install
npm run dev        # starts both Colyseus server (port 2567) and Vite client (port 5173)
```

## License

MIT
