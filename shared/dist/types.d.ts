export type GameMode = "classic" | "goals";
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
export interface BasePlayerState {
    sessionId: string;
    name: string;
    lives: number;
    eliminated: boolean;
    ready: boolean;
}
export interface BaseGameState {
    phase: string;
    mode: string;
    winnerId: string;
    winnerName: string;
    ball: BallState;
    maxPlayers: number;
}
export interface ClassicPlayerState extends BasePlayerState {
    colorIndex: number;
    edgeIndex: number;
    paddlePosition: number;
}
export interface ClassicGameState extends BaseGameState {
    players: Map<string, ClassicPlayerState>;
    arenaRadius: number;
    numSides: number;
}
export interface GoalsPlayerState extends BasePlayerState {
    goalAngle: number;
    paddleAngle: number;
    colorIndex: number;
}
export interface GoalsGameState extends BaseGameState {
    players: Map<string, GoalsPlayerState>;
    arenaRadius: number;
    goalRingRadius: number;
    goalRadius: number;
    orbitRadius: number;
}
//# sourceMappingURL=types.d.ts.map