export interface Vector2 {
  x: number;
  y: number;
}

export interface Edge {
  start: Vector2;
  end: Vector2;
  midpoint: Vector2;
  normal: Vector2;
  angle: number;
  length: number;
}

export interface BallState {
  x: number;
  y: number;
}

export interface PlayerState {
  sessionId: string;
  name: string;
  colorIndex: number;
  edgeIndex: number;
  lives: number;
  eliminated: boolean;
  ready: boolean;
  paddlePosition: number;
}

export interface GameState {
  phase: string;
  winnerId: string;
  winnerName: string;
  players: Map<string, PlayerState>;
  ball: BallState;
  arenaRadius: number;
  numSides: number;
  maxPlayers: number;
}
