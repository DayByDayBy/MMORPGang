import type { Vector2, Edge } from "./types.js";
export interface ArenaConfig {
    numSides: number;
    edgeAssignments: number[];
}
export declare function getArenaConfig(playerCount: number): ArenaConfig;
export declare function computeVertices(numSides: number, radius: number): Vector2[];
export declare function computeEdges(numSides: number, radius: number): Edge[];
//# sourceMappingURL=geometry.d.ts.map