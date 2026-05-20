import * as THREE from "three";

export enum CurveType {
    LINE = "Line",
    QUADRATIC_BEZIER = "QuadraticBezier",
    CUBIC_BEZIER = "CubicBezier",
    CATMULL_ROM = "CatmullRom",
    ELLIPSE = "Ellipse",
}

// Default curve points - a simple S-curve
const defaultCurvePoints = [
    new THREE.Vector3(-2, 0, 0),
    new THREE.Vector3(-1, 1, 0),
    new THREE.Vector3(1, -1, 0),
    new THREE.Vector3(2, 0, 0),
];

/**
 * Custom Tube Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D tube created along a bezier curve path
 */
class CustomTube extends THREE.Mesh {
    /**
     * Create a new CustomTube object from curve points
     * @param {THREE.Vector3[]} curvePoints - Array of 3D points defining the curve path
     * @param {CurveType} curveType - Type of curve to create
     * @param {number} tubularSegments - Number of segments along the tube length
     * @param {number} radius - Tube radius
     * @param {number} radialSegments - Number of segments around the tube circumference
     * @param {boolean} closed - Whether the tube is closed
     * @param {number} extrudeDepth - Extrusion depth (0 for tube, >0 for extruded shape)
     * @param {THREE.BufferGeometry} geometry - The geometry
     * @param {THREE.MeshStandardMaterial} material - The material to apply
     */
    constructor(
        curvePoints: THREE.Vector3[] = defaultCurvePoints,
        curveType: CurveType = CurveType.CATMULL_ROM,
        tubularSegments: number = 64,
        radius: number = 0.2,
        radialSegments: number = 8,
        closed: boolean = false,
        extrudeDepth: number = 0,
        geometry?: THREE.BufferGeometry,
        material: THREE.Material = new THREE.MeshStandardMaterial(),
    ) {
        // Create geometry from curve points if geometry not provided
        if (!geometry) {
            geometry = CustomTube.createGeometryFromCurve(
                curvePoints,
                curveType,
                tubularSegments,
                radius,
                radialSegments,
                closed,
                extrudeDepth,
            );
        }

        super(geometry, material);
        this.name = extrudeDepth > 0 ? "Custom Extruded Shape" : "Custom Tube";
        this.castShadow = true;
        this.receiveShadow = true;

        // Store the curve parameters for later editing
        this.userData.curvePoints = curvePoints.map(p => ({ x: p.x, y: p.y, z: p.z }));
        this.userData.curveType = curveType;
        this.userData.tubularSegments = tubularSegments;
        this.userData.radius = radius;
        this.userData.radialSegments = radialSegments;
        this.userData.closed = closed;
        this.userData.extrudeDepth = extrudeDepth;

        // Set up default physics properties
        this.userData.physics = this.userData.physics || {
            enabled: true,
            type: "rigidBody",
            shape: "btBoxShape",
            mass: 0,
            inertia: {
                x: 0,
                y: 0,
                z: 0,
            },
            restitution: 0,
            ctype: "Static",
        };
    }

    /**
     * Create geometry from curve points
     * @param {THREE.Vector3[]} curvePoints - Array of 3D points defining the curve
     * @param {CurveType} curveType - Type of curve to create
     * @param {number} tubularSegments - Number of segments along the tube
     * @param {number} radius - Tube radius
     * @param {number} radialSegments - Number of segments around the tube
     * @param {boolean} closed - Whether the tube is closed
     * @param {number} extrudeDepth - Extrusion depth (0 for tube, >0 for extruded shape)
     * @returns {THREE.BufferGeometry}
     */
    static createGeometryFromCurve(
        curvePoints: THREE.Vector3[],
        curveType: CurveType = CurveType.CATMULL_ROM,
        tubularSegments: number = 64,
        radius: number = 0.2,
        radialSegments: number = 8,
        closed: boolean = false,
        extrudeDepth: number = 0,
    ): THREE.BufferGeometry {
        try {
            if (curvePoints.length < 2) {
                throw new Error("Need at least 2 points to create a curve");
            }

            // Create curve based on type
            let curve: THREE.Curve<THREE.Vector3>;

            switch (curveType) {
                case CurveType.LINE:
                    curve = new THREE.LineCurve3(curvePoints[0], curvePoints[curvePoints.length - 1]);
                    break;
                case CurveType.QUADRATIC_BEZIER:
                    if (curvePoints.length < 3) {
                        throw new Error("Quadratic Bezier requires at least 3 points");
                    }
                    curve = new THREE.QuadraticBezierCurve3(curvePoints[0], curvePoints[1], curvePoints[2]);
                    break;
                case CurveType.CUBIC_BEZIER:
                    if (curvePoints.length < 4) {
                        throw new Error("Cubic Bezier requires at least 4 points");
                    }
                    curve = new THREE.CubicBezierCurve3(curvePoints[0], curvePoints[1], curvePoints[2], curvePoints[3]);
                    break;
                case CurveType.CATMULL_ROM:
                default:
                    curve = new THREE.CatmullRomCurve3(curvePoints, closed);
                    break;
            }

            // Create extruded geometry if extrudeDepth > 0
            if (extrudeDepth > 0) {
                // Get 2D points from the curve
                const points2D = curvePoints.map(p => new THREE.Vector2(p.x, p.y));
                const shape = new THREE.Shape(points2D);

                const extrudeSettings = {
                    depth: extrudeDepth,
                    bevelEnabled: false,
                    steps: Math.max(1, Math.floor(tubularSegments / 4)),
                };

                return new THREE.ExtrudeGeometry(shape, extrudeSettings);
            } else {
                // Create tube geometry
                return new THREE.TubeGeometry(
                    curve,
                    tubularSegments,
                    radius,
                    radialSegments,
                    closed,
                );
            }
        } catch (error) {
            console.error("Failed to create geometry:", error);
            // Return a simple straight tube as fallback
            const fallbackCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-1, 0, 0),
                new THREE.Vector3(1, 0, 0),
            ]);
            return new THREE.TubeGeometry(fallbackCurve, 20, 0.2, 8, false);
        }
    }

    /**
     * Update the tube with new curve points
     * @param {THREE.Vector3[]} curvePoints - New curve points
     * @param {CurveType} curveType - Type of curve
     * @param {number} tubularSegments - Number of segments along the tube
     * @param {number} radius - Tube radius
     * @param {number} radialSegments - Number of segments around the tube
     * @param {boolean} closed - Whether the tube is closed
     * @param {number} extrudeDepth - Extrusion depth
     */
    updateTube(
        curvePoints: THREE.Vector3[],
        curveType?: CurveType,
        tubularSegments?: number,
        radius?: number,
        radialSegments?: number,
        closed?: boolean,
        extrudeDepth?: number,
    ) {
        const newGeometry = CustomTube.createGeometryFromCurve(
            curvePoints,
            curveType ?? this.userData.curveType,
            tubularSegments ?? this.userData.tubularSegments,
            radius ?? this.userData.radius,
            radialSegments ?? this.userData.radialSegments,
            closed ?? this.userData.closed,
            extrudeDepth ?? this.userData.extrudeDepth,
        );

        // Dispose old geometry
        this.geometry.dispose();

        // Update geometry
        this.geometry = newGeometry;

        // Store the parameters
        this.userData.curvePoints = curvePoints.map(p => ({ x: p.x, y: p.y, z: p.z }));
        if (curveType !== undefined) this.userData.curveType = curveType;
        if (tubularSegments !== undefined) this.userData.tubularSegments = tubularSegments;
        if (radius !== undefined) this.userData.radius = radius;
        if (radialSegments !== undefined) this.userData.radialSegments = radialSegments;
        if (closed !== undefined) this.userData.closed = closed;
        if (extrudeDepth !== undefined) this.userData.extrudeDepth = extrudeDepth;

        // Update name based on extrusion
        this.name = (extrudeDepth ?? this.userData.extrudeDepth) > 0 ? "Custom Extruded Shape" : "Custom Tube";
    }
}

export default CustomTube;
