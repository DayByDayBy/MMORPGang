export function ballNearSegment(bx, by, a, b, hitDistSq) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((bx - a.x) * dx + (by - a.y) * dy) / lenSq));
    const distSq = (bx - (a.x + t * dx)) ** 2 + (by - (a.y + t * dy)) ** 2;
    return distSq <= hitDistSq;
}
export function ballPassedEdge(bx, by, ballRadius, edge) {
    const relX = bx - edge.start.x;
    const relY = by - edge.start.y;
    const dot = relX * edge.normal.x + relY * edge.normal.y;
    if (dot <= ballRadius)
        return false;
    const edgeDx = edge.end.x - edge.start.x;
    const edgeDy = edge.end.y - edge.start.y;
    const proj = (relX * edgeDx + relY * edgeDy) / edge.length;
    return proj >= -ballRadius && proj <= edge.length + ballRadius;
}
export function reflectVelocity(vx, vy, normal, speedUp = 1.02) {
    const dot = vx * normal.x + vy * normal.y;
    return {
        x: (vx - 2 * dot * normal.x) * speedUp,
        y: (vy - 2 * dot * normal.y) * speedUp,
    };
}
export function clampSpeed(vx, vy, maxSpeed) {
    const speed = Math.sqrt(vx ** 2 + vy ** 2);
    if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        return { x: vx * scale, y: vy * scale };
    }
    return { x: vx, y: vy };
}
export function getPaddleEndpoints(paddlePosition, edge, widthRatio) {
    const cx = edge.start.x + (edge.end.x - edge.start.x) * paddlePosition;
    const cy = edge.start.y + (edge.end.y - edge.start.y) * paddlePosition;
    const halfLen = (edge.length * widthRatio) / 2;
    const cos = Math.cos(edge.angle);
    const sin = Math.sin(edge.angle);
    return {
        start: { x: cx - cos * halfLen, y: cy - sin * halfLen },
        end: { x: cx + cos * halfLen, y: cy + sin * halfLen },
    };
}
//# sourceMappingURL=physics.js.map