import { HeightFn } from './EndlessTerrainTypes';

/**
 * The diagonal to use for the triangulation of each grid square.
 * 
 * @remarks
 * Assume each grid square has vertices A, B, C, and D. There are two possible
 * diagonals: AC and BD. The choice of diagonal affects how the square is
 * triangulated and thus how the height is computed.
 */
enum TriangulationDiagonal {
    AC,
    BD,
}

/**
 * A helper class that adapts a continuous height function to a grid-based
 * height function.
 * 
 * @remarks
 * This class can be used to get exact heights for points on a grid-based
 * terrain. It is assumed that the terrain is an infinite grid of squares, where
 * each square is triangulated.
 * 
 * For a given point (x, z), the height is computed by finding the grid square
 * that contains (x, z), fetching the height at each vertex of the square using
 * the "raw" height function, and then interpolating the height using
 * barycentric coordinates.
 */
export class EndlessTerrainGridHeight {
    /**
     * @param heightFn - The "raw" or continuous height function.
     * @param gridSpacing - The size of each grid square.
     * @param gridOffset - The offset of the grid from the origin.
     * @param diagonal - The diagonal to use for triangulation of each grid square.
     */
    constructor(
        private readonly heightFn: HeightFn,
        private readonly gridSpacing: number,
        private readonly gridOffset: number,
        private readonly diagonal = TriangulationDiagonal.BD,
    ) {
    }

    getHeightFn(): HeightFn {
        return (x: number, z: number) => {
            // Find (x, z) in "grid" space.
            const xGrid = (x - this.gridOffset) / this.gridSpacing;
            const zGrid = (z - this.gridOffset) / this.gridSpacing;

            // Find the bounds of the grid square containing (x, z).
            const minX = Math.floor(xGrid);
            const minZ = Math.floor(zGrid);
            const maxX = minX + 1;
            const maxZ = minZ + 1;

            // Compute (u, v) in [0, 1] space.
            const u = xGrid - minX;
            const v = zGrid - minZ;

            // Determine which triangle the point (x, z) is in.
            let pts: [[number, number], [number, number], [number, number]];
            let weights: [number, number, number];

            if (this.diagonal === TriangulationDiagonal.AC) {
                const isInTriangleA = u >= v;

                pts = isInTriangleA
                    ? [[minX, minZ], [maxX, minZ], [maxX, maxZ]]
                    : [[minX, minZ], [maxX, maxZ], [minX, maxZ]];

                weights = isInTriangleA
                    ? [1 - u, u - v, v]
                    : [1 - v, v - u, u];
            } else {
                const isInTriangleA = v < -u + 1;

                pts = isInTriangleA
                    ? [[minX, minZ], [maxX, minZ], [minX, maxZ]]
                    : [[maxX, minZ], [maxX, maxZ], [minX, maxZ]];

                weights = isInTriangleA
                    ? [1 - u - v, u, v]
                    : [1 - v, u + v - 1, 1 - u];
            }

            // Get the height of each vertex.
            const heights = pts.map(
                ([x, z]) => this.heightFn(
                    x * this.gridSpacing + this.gridOffset,
                    z * this.gridSpacing + this.gridOffset,
                ),
            ) as [number, number, number];

            // Determine the height at (x, z) using bilinear interpolation.
            return weights[0] * heights[0] + weights[1] * heights[1] + weights[2] * heights[2];
        };
    }
}
