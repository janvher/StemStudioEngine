// Ammo.js seems to require a non-zero capsule Y-scale, even if the capsule's
// height is entirely derived from its radius. Rapier does not have this issue.
// Keep in mind that the total height of a capsule is the cylindrical height +
// 2*radius.
const MIN_CAPSULE_Y_SCALE = 1e-10;

class MathUtils {

    static applyMatrix4ToVector3({x = 0, y = 0, z = 0}, matrix: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]) {
        const w = 1 / (matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15]);

        return {
            x: (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) * w,
            y: (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) * w,
            z: (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) * w,
        };
    }

    static clamp(value: number, min: number, max: number) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Computes adjusted scaling factors for a capsule shape.
     *
     * In Ammo/Bullet physics, a capsule's total height = cylindrical height +
     * 2*radius. When scaling, we need to adjust the Y scale factor so that the
     * total height scales by the desired Y factor, not just the cylindrical
     * portion.
     * 
     * @param radius - The radius of the capsule
     * @param height - The height of the capsule
     * @param scale - The local scale of the object
     * @param scale.x
     * @param scale.y
     * @param scale.z
     * @returns The adjusted scaling factors
     */
    static computeCapsuleScale(
        radius: number,
        height: number,
        scale: { x: number; y: number; z: number },
    ): { x: number; y: number; z: number } {
        const radiusScale = Math.max(scale.x, scale.z);

        // Handle spherical capsule (h = 0)
        if (height === 0) {
            return { x: radiusScale, y: radiusScale, z: radiusScale };
        }

        // Compute adjusted Y scale to preserve total height constraint
        const totalHeight = height + 2 * radius;
        const desiredTotalHeight = totalHeight * scale.y;
        const newRadius = radius * radiusScale;
        const newCylindricalHeight = Math.max(desiredTotalHeight - 2 * newRadius, 0);
        const adjustedYScale = Math.max(MIN_CAPSULE_Y_SCALE, newCylindricalHeight / height);

        return { x: radiusScale, y: adjustedYScale, z: radiusScale };
    }
}

export default MathUtils;