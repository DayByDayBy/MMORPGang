import type { Edge, Vector2, BallState } from "./types.js";
import { ballNearSegment, ballPassedEdge, reflectVelocity, clampSpeed, getPaddleEndpoints } from "./physics.js";
import { BALL_RADIUS, CLASSIC_MAX_BALL_SPEED, CLASSIC_PADDLE_WIDTH_RATIO } from "./constants.js";

export interface ClassicSimPlayer {
  edgeIndex: number;
  paddlePosition: number;
  prevPaddlePosition: number;
  eliminated: boolean;
}

export interface ClassicSimState {
  ball: BallState;
  edges: Edge[];
  players: ClassicSimPlayer[];
  arenaRadius: number;
}

export interface ClassicSimEvent {
  type: "paddle_hit" | "scored";
  playerIndex: number;
}

export interface ClassicSimResult {
  ball: BallState;
  events: ClassicSimEvent[];
  ballReset: boolean;
}

const BALL_HIT_DIST_SQ = (BALL_RADIUS + 4) ** 2;
const SPIN_INFLUENCE = 0.6;

export function classicPhysicsStep(state: ClassicSimState): ClassicSimResult {
  const ball: BallState = {
    x: state.ball.x + state.ball.vx,
    y: state.ball.y + state.ball.vy,
    vx: state.ball.vx,
    vy: state.ball.vy,
  };

  const events: ClassicSimEvent[] = [];
  let ballReset = false;

  const playersByEdge = new Map<number, { player: ClassicSimPlayer; index: number }>();
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    playersByEdge.set(p.edgeIndex, { player: p, index: i });
  }

  for (let i = 0; i < state.edges.length; i++) {
    const edge = state.edges[i];
    const entry = playersByEdge.get(i);

    if (!entry || entry.player.eliminated) {
      if (ballNearSegment(ball.x, ball.y, edge.start, edge.end, BALL_HIT_DIST_SQ)) {
        reflectBall(ball, edge.normal);
        pushBallIn(ball, edge);
      }
      continue;
    }

    const { player, index } = entry;
    const endpoints = getPaddleEndpoints(player.paddlePosition, edge, CLASSIC_PADDLE_WIDTH_RATIO);

    if (ballNearSegment(ball.x, ball.y, endpoints.start, endpoints.end, BALL_HIT_DIST_SQ)) {
      reflectBall(ball, edge.normal);
      applyPaddleSpin(ball, player, edge);
      pushBallIn(ball, edge);
      events.push({ type: "paddle_hit", playerIndex: index });
      continue;
    }

    if (ballPassedEdge(ball.x, ball.y, BALL_RADIUS, edge)) {
      events.push({ type: "scored", playerIndex: index });
      ballReset = true;
      break;
    }
  }

  const dist = Math.sqrt(ball.x ** 2 + ball.y ** 2);
  if (dist > state.arenaRadius * 1.5) {
    ballReset = true;
  }

  return { ball, events, ballReset };
}

function reflectBall(ball: BallState, normal: Vector2) {
  const v = reflectVelocity(ball.vx, ball.vy, normal);
  const clamped = clampSpeed(v.x, v.y, CLASSIC_MAX_BALL_SPEED);
  ball.vx = clamped.x;
  ball.vy = clamped.y;
}

function applyPaddleSpin(ball: BallState, player: ClassicSimPlayer, edge: Edge) {
  const velocity_t = player.paddlePosition - player.prevPaddlePosition;
  const speed = velocity_t * edge.length;
  ball.vx += Math.cos(edge.angle) * speed * SPIN_INFLUENCE;
  ball.vy += Math.sin(edge.angle) * speed * SPIN_INFLUENCE;
  const clamped = clampSpeed(ball.vx, ball.vy, CLASSIC_MAX_BALL_SPEED);
  ball.vx = clamped.x;
  ball.vy = clamped.y;
}

function pushBallIn(ball: BallState, edge: { normal: Vector2 }) {
  ball.x -= edge.normal.x * 2;
  ball.y -= edge.normal.y * 2;
}
