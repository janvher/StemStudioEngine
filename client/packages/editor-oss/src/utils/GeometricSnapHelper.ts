import * as THREE from "three";

export interface GeometricSnapSettings {
    snapToVertex: boolean;
    snapToEdge: boolean;
    snapToFace: boolean;
    snapDistance: number;
    visualFeedback: boolean;
}

export interface SnapResult {
    position: THREE.Vector3;
    type: "vertex" | "edge" | "face";
    target: THREE.Object3D;
    normal?: THREE.Vector3;
}

/**
 * GeometricSnapHelper - Provides vertex/edge/face snapping for object transforms
 *
 * Phase 4 MVP: Vertex snapping only
 * Phase 5: Edge and face snapping
 */
export class GeometricSnapHelper {
    private scene: THREE.Scene;
    private sceneHelpers: THREE.Object3D;
    private settings: GeometricSnapSettings;
    private snapIndicator: THREE.Mesh | null = null;
    private vertexCache: Map<string, THREE.Vector3[]> = new Map();
    private cacheTimestamps: Map<string, number> = new Map();
    private readonly CACHE_MAX_SIZE = 100;
    private readonly CACHE_INVALIDATION_TIME = 5000; // 5 seconds

    constructor(
        scene: THREE.Scene,
        sceneHelpers: THREE.Object3D,
        settings: GeometricSnapSettings,
    ) {
        this.scene = scene;
        this.sceneHelpers = sceneHelpers;
        this.settings = settings;

        if (settings.visualFeedback) {
            this.createSnapIndicator();
        }
    }

    /**
     * Update snap settings
     * @param settings
     */
    updateSettings(settings: GeometricSnapSettings): void {
        this.settings = settings;

        if (settings.visualFeedback && !this.snapIndicator) {
            this.createSnapIndicator();
        } else if (!settings.visualFeedback && this.snapIndicator) {
            this.hideSnapIndicator();
        }
    }

    /**
     * Find the closest snap target for a given position
     * @param position
     * @param excludeObjects
     */
    findSnapTarget(
        position: THREE.Vector3,
        excludeObjects: THREE.Object3D[],
    ): SnapResult | null {
        let closestSnap: SnapResult | null = null;
        let minDistance = this.settings.snapDistance;

        // Priority: vertex > edge > face (MVP: vertex only)

        // 1. Vertex snapping
        if (this.settings.snapToVertex) {
            const vertexSnap = this.findClosestVertex(position, excludeObjects);
            if (vertexSnap && vertexSnap.distance < minDistance) {
                closestSnap = {
                    position: vertexSnap.position,
                    type: "vertex",
                    target: vertexSnap.object,
                };
                minDistance = vertexSnap.distance;
            }
        }

        // 2. Edge snapping (Phase 5 - not implemented yet)
        // if (this.settings.snapToEdge && !closestSnap) {
        //     const edgeSnap = this.findClosestEdge(position, excludeObjects);
        //     if (edgeSnap && edgeSnap.distance < minDistance) {
        //         closestSnap = {
        //             position: edgeSnap.position,
        //             type: "edge",
        //             target: edgeSnap.object,
        //         };
        //         minDistance = edgeSnap.distance;
        //     }
        // }

        // 3. Face snapping (Phase 5 - not implemented yet)
        // if (this.settings.snapToFace && !closestSnap) {
        //     const faceSnap = this.findClosestFace(position, excludeObjects);
        //     if (faceSnap && faceSnap.distance < minDistance) {
        //         closestSnap = {
        //             position: faceSnap.position,
        //             type: "face",
        //             target: faceSnap.object,
        //             normal: faceSnap.normal,
        //         };
        //     }
        // }

        // Update visual feedback
        if (closestSnap && this.settings.visualFeedback) {
            this.showSnapIndicator(closestSnap.position, closestSnap.type);
        } else if (this.settings.visualFeedback) {
            this.hideSnapIndicator();
        }

        return closestSnap;
    }

    /**
     * Find the closest vertex within snap distance
     * @param position
     * @param excludeObjects
     */
    private findClosestVertex(
        position: THREE.Vector3,
        excludeObjects: THREE.Object3D[],
    ): { position: THREE.Vector3; distance: number; object: THREE.Object3D } | null {
        let closest: {
            position: THREE.Vector3;
            distance: number;
            object: THREE.Object3D;
        } | null = null;
        let minDist = this.settings.snapDistance;

        // Collect all meshes to check
        const meshesToCheck: THREE.Mesh[] = [];

        this.scene.traverse((object) => {
            // Skip excluded objects and non-mesh objects
            if (excludeObjects.includes(object) || !(object instanceof THREE.Mesh)) {
                return;
            }

            // Skip gizmos and helpers
            if (object.userData?.tag === "gizmo" || object.name?.includes("Helper")) {
                return;
            }

            meshesToCheck.push(object as THREE.Mesh);
        });

        // Check each mesh
        for (const mesh of meshesToCheck) {
            const geometry = mesh.geometry;

            if (!geometry || !geometry.attributes.position) {
                continue;
            }

            // Get or compute vertices
            const vertices = this.getWorldVertices(mesh);

            // Check each vertex
            for (const vertex of vertices) {
                const dist = position.distanceTo(vertex);
                if (dist < minDist) {
                    minDist = dist;
                    closest = {
                        position: vertex.clone(),
                        distance: dist,
                        object: mesh,
                    };
                }
            }
        }

        return closest;
    }

    /**
     * Get world-space vertices for a mesh (with caching)
     * @param mesh
     */
    private getWorldVertices(mesh: THREE.Mesh): THREE.Vector3[] {
        const cacheKey = mesh.uuid;
        const now = Date.now();

        // Check cache validity
        const cachedTimestamp = this.cacheTimestamps.get(cacheKey);
        if (
            cachedTimestamp &&
            now - cachedTimestamp < this.CACHE_INVALIDATION_TIME &&
            this.vertexCache.has(cacheKey)
        ) {
            return this.vertexCache.get(cacheKey)!;
        }

        // Compute vertices
        const geometry = mesh.geometry;
        const positionAttribute = geometry.attributes.position;
        if (!positionAttribute) {
            return [];
        }
        const vertices: THREE.Vector3[] = [];
        const vertex = new THREE.Vector3();

        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);
            vertex.applyMatrix4(mesh.matrixWorld);
            vertices.push(vertex.clone());
        }

        // Update cache
        this.vertexCache.set(cacheKey, vertices);
        this.cacheTimestamps.set(cacheKey, now);

        // Limit cache size
        if (this.vertexCache.size > this.CACHE_MAX_SIZE) {
            // Remove oldest entry
            const oldestKey = this.cacheTimestamps.keys().next().value;
            if (oldestKey !== undefined) {
                this.vertexCache.delete(oldestKey);
                this.cacheTimestamps.delete(oldestKey);
            }
        }

        return vertices;
    }

    /**
     * Create visual indicator for snap points
     */
    private createSnapIndicator(): void {
        const geometry = new THREE.SphereGeometry(0.15, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.7,
            depthTest: false,
        });

        this.snapIndicator = new THREE.Mesh(geometry, material);
        this.snapIndicator.visible = false;
        this.snapIndicator.userData.tag = "gizmo";
        this.snapIndicator.name = "SnapIndicator";
        this.sceneHelpers.add(this.snapIndicator);
    }

    /**
     * Show snap indicator at position with color based on type
     * @param position
     * @param type
     */
    private showSnapIndicator(
        position: THREE.Vector3,
        type: "vertex" | "edge" | "face",
    ): void {
        if (!this.snapIndicator) return;

        // Color code by type
        const colors = {
            vertex: 0x00ff00, // green
            edge: 0x0000ff, // blue
            face: 0xff00ff, // magenta
        };

        (this.snapIndicator.material as THREE.MeshBasicMaterial).color.setHex(
            colors[type],
        );
        this.snapIndicator.position.copy(position);
        this.snapIndicator.visible = true;
    }

    /**
     * Hide snap indicator
     */
    private hideSnapIndicator(): void {
        if (this.snapIndicator) {
            this.snapIndicator.visible = false;
        }
    }

    /**
     * Clear vertex cache (call when objects transform)
     */
    clearCache(): void {
        this.vertexCache.clear();
        this.cacheTimestamps.clear();
    }

    /**
     * Invalidate cache for specific object
     * @param object
     */
    invalidateObject(object: THREE.Object3D): void {
        this.vertexCache.delete(object.uuid);
        this.cacheTimestamps.delete(object.uuid);
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.clearCache();

        if (this.snapIndicator) {
            this.snapIndicator.geometry.dispose();
            (this.snapIndicator.material as THREE.Material).dispose();
            this.sceneHelpers.remove(this.snapIndicator);
            this.snapIndicator = null;
        }
    }
}
