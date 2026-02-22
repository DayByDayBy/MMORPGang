import type { Vector2, Edge } from "./types.js";
export declare function ballNearSegment(bx: number, by: number, a: Vector2, b: Vector2, hitDistSq: number): boolean;
export declare function ballPassedEdge(bx: number, by: number, ballRadius: number, edge: Edge): boolean;
export declare function reflectVelocity(vx: number, vy: number, normal: Vector2, speedUp?: number): Vector2;
export declare function clampSpeed(vx: number, vy: number, maxSpeed: number): Vector2;
export declare function getPaddleEndpoints(paddlePosition: number, edge: Edge, widthRatio: number): {
    start: Vector2;
    end: Vector2;
};
//# sourceMappingURL=physics.d.ts.map