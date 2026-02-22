export interface GoalsBallState {
    x: number;
    y: number;
    vx: number;
    vy: number;
}
/**
 * Bounce ball off the circular arena wall.
 * Returns true if a bounce occurred.
 */
export declare function bounceOffCircularWall(ball: GoalsBallState, arenaRadius: number, ballRadius?: number): boolean;
/**
 * Check if the ball hits a player's arc paddle.
 * Returns true if reflected (save).
 */
export declare function checkGoalsPaddleCollision(ball: GoalsBallState, paddleAngle: number, paddleArc: number, goalX: number, goalY: number, orbitRadius: number, ballRadius?: number): boolean;
/**
 * Check if the ball entered a player's goal circle.
 * Returns true if scored (life lost).
 */
export declare function checkGoalsGoalCollision(ball: GoalsBallState, goalX: number, goalY: number, goalRadius: number, orbitRadius: number, ballRadius?: number): boolean;
/**
 * Get evenly distributed slot angles around the arena.
 */
export declare function getGoalsSlotAngles(count: number): number[];
//# sourceMappingURL=goals-physics.d.ts.map