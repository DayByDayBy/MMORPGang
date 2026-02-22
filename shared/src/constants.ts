// --- Shared constants (both modes) ---

export const MAX_PLAYERS = 12;
export const MIN_PLAYERS = 2;
export const DEFAULT_LIVES = 3;
export const TICK_RATE = 60;
export const BALL_RADIUS = 8;
export const BALL_SPEED = 5;
export const MAX_CLIP_DURATION = 1.5;

export const PLAYER_COLORS = [
  "#ef4444", // red-500
  "#3b82f6", // blue-500
  "#22c55e", // green-500
  "#facc15", // yellow-400
  "#f97316", // orange-500
  "#a855f7", // purple-500
  "#4ade80", // green-400
  "#7dd3fc", // sky-300
  "#d946ef", // fuchsia-500
  "#fb7185", // rose-400
  "#2dd4bf", // teal-400
  "#a3a3a3", // neutral-400
] as const;

// --- Classic mode constants ---

export const CLASSIC_ARENA_RADIUS = 350;
export const CLASSIC_PADDLE_WIDTH_RATIO = 0.35;
export const CLASSIC_PADDLE_SPEED = 0.02;
export const CLASSIC_MAX_BALL_SPEED = 14;

// --- Goals mode constants ---

export const GOALS_ARENA_RADIUS = 360;
export const GOALS_GOAL_RING_RADIUS = 259;
export const GOALS_GOAL_RADIUS = 18;
export const GOALS_ORBIT_RADIUS = 54;
export const GOALS_ORBIT_RADIUS_MIN = 30;
export const GOALS_ORBIT_RADIUS_MAX = 80;
export const GOALS_ORBIT_RADIUS_SPEED = 1.5;
export const GOALS_PADDLE_ARC = 0.5;
export const GOALS_ORBIT_SPEED = 0.5;
export const GOALS_ORBIT_ACCEL = 0.18;
export const GOALS_MAX_BALL_SPEED = 10;
export const GOALS_LIVES = 5;
export const GOALS_BALL_SPAWN_INTERVAL = 3600;
