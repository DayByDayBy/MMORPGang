decided to build a react app (vite) to start building in 

i figure go modular, so we can easily split concerns and work in parallel



gonna make a dir for `client`, `server`, `shared`

client will be vite + react - front end and that
server will be node + ts + sockets.io -  backend and that
shared will be typescript + types, consts, math stuff, etc

at least thats the current plan (ongoing)



some thoughts on components:

/game
  Ball.ts       ← renders ball from BallState
  Player.ts     ← renders player/paddle from PlayerState  
  Goal.ts       ← renders goal from PlayerState
  Arena.ts      ← renders arena circle and background



each class takes a pixi container and state object, knows how to draw itself. no physics, no input, no networking etc in those, just rendering


eg sth like:

```
export class Ball {
  private gfx: Graphics
  private trailGfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    this.trailGfx = new Graphics()
    stage.addChild(this.trailGfx, this.gfx)
  }

  render(state: BallState) {
    // draw from state
  }
}

```

---

server-side game logic is in:

- `server/src/index.ts` — 60hz tick loop, socket wiring, physics dispatch
- `server/src/game/Ball.ts` — ball state, movement, circular wall bounce
- `server/src/game/GameState.ts` — player add/remove, slot assignment, input map, `applyInputs()`
- `server/src/game/Physics.ts` — `checkPaddleCollision` + `checkGoalCollision`

client still renders mock state — wiring server state to the renderer is next up

 

on `lives`: the goal collision logic decrements `player.lives` and resets the ball - the lives mechanic might want rethinking?

shrinking paddle arc, definitely, but also maybe rather than lives, it's more fun to play til you disconnect, or to make the goal grow until you lose, or sth

---

**environment variables**

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `VITE_SERVER_URL` | client `.env` | `http://localhost:3001` | Socket.io server endpoint |

Local dev works without any `.env` file. To point at a remote server, create `client/.env` with `VITE_SERVER_URL=https://your-server.example.com`.

---

**coordinate system** — all physics now runs in canonical world space:

- `WORLD_SIZE = 800`, arena centred at `(0, 0)`
- `ARENA_RADIUS`, `GOAL_RING_RADIUS`, `GOAL_RADIUS`, `ORBIT_RADIUS`, `BALL_RADIUS`, `BALL_BASE_SPEED` all derived from `WORLD_SIZE` in `shared/src/index.ts` — no local recalculation anywhere
- client maps world → screen with a single scale factor: `SCALE = Math.min(W, H) / WORLD_SIZE`; helper fns `wx(x)`, `wy(y)`, `toScreen(v)` for rendering
- ball velocity is now in world-units/second; `Ball.update(dt)` takes dt in seconds (`1 / TICK_RATE`), so physics is tick-rate-independent

