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
