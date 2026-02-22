// --- Shared constants (both modes) ---

export const MAX_PLAYERS = 12;
export const MIN_PLAYERS = 2;
export const DEFAULT_LIVES = 3;
export const TICK_RATE = 60;
export const BALL_RADIUS = 8;
export const BALL_SPEED = 5;
export const MAX_CLIP_DURATION = 1.5;

export const PLAYER_COLORS = [
  "#FF4136", // red
  "#0074D9", // blue
  "#2ECC40", // green
  "#FFDC00", // yellow
  "#FF851B", // orange
  "#B10DC9", // purple
  "#01FF70", // lime
  "#7FDBFF", // aqua
  "#F012BE", // fuchsia
  "#FF6384", // pink
  "#39CCCC", // teal
  "#AAAAAA", // silver
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
