import type { Vector2, Edge } from "./types.js";

export interface ArenaConfig {
  numSides: number;
  edgeAssignments: number[];
}

export function getArenaConfig(playerCount: number): ArenaConfig {
  if (playerCount === 2) {
    return { numSides: 4, edgeAssignments: [0, 2] };
  }
  return {
    numSides: playerCount,
    edgeAssignments: Array.from({ length: playerCount }, (_, i) => i),
  };
}

export function computeVertices(numSides: number, radius: number): Vector2[] {
  return Array.from({ length: numSides }, (_, i) => ({
    x: radius * Math.cos((2 * Math.PI * i) / numSides - Math.PI / 2),
    y: radius * Math.sin((2 * Math.PI * i) / numSides - Math.PI / 2),
  }));
}

export function computeEdges(numSides: number, radius: number): Edge[] {
  const vertices = computeVertices(numSides, radius);
  const edges: Edge[] = [];

  for (let i = 0; i < numSides; i++) {
    const start = vertices[i];
    const end = vertices[(i + 1) % numSides];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    edges.push({
      start,
      end,
      midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      normal: { x: dy / len, y: -dx / len },
      angle: Math.atan2(dy, dx),
      length: len,
    });
  }

  return edges;
}
