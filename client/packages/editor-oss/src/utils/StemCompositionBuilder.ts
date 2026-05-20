import * as THREE from "three";

import {StemComposition, StemPrimitive} from "./ModelGeneratorProvider";
import Box from "../object/geometry/Box";
import Cone from "../object/geometry/Cone";
import Cylinder from "../object/geometry/Cylinder";
import Group from "../object/geometry/Group";
import Plane from "../object/geometry/Plane";
import Sphere from "../object/geometry/Sphere";

/**
 * Builds Three.js scene objects from Erth composition data
 */
export class StemCompositionBuilder {
    /**
     * Build a StemStudio Group from composition with properly instantiated primitives
     * Groups related primitives based on hierarchical naming (e.g., "church/tower/body_main")
     * @param composition
     */
    static buildFromComposition(composition: StemComposition): Group {
        console.log("[StemCompositionBuilder] Building composition with", composition.primitives.length, "primitives");

        const rootGroup = new Group();
        rootGroup.name = "Erth Generated";

        // Map to track created groups by path
        const groupMap = new Map<string, Group>();
        groupMap.set("", rootGroup);

        composition.primitives.forEach((primitive, index) => {
            const mesh = this.buildPrimitive(primitive, index);
            if (mesh) {
                // Parse hierarchical name to create group structure
                // e.g., "church/tower/body_main" -> groups: ["church", "church/tower"], mesh: "body_main"
                const parentGroup = this.getOrCreateGroupHierarchy(primitive.name, groupMap, rootGroup);
                parentGroup.add(mesh);
                console.log(`[StemCompositionBuilder] Added ${primitive.type}: "${mesh.name}" to group "${parentGroup.name}" at position`, primitive.position);
            }
        });

        // Store metadata in userData for potential future use
        rootGroup.userData.erth = {
            totalPrimitives: composition.metadata.totalPrimitives,
            boundingBox: composition.metadata.boundingBox,
            generatedImage: composition.metadata.generatedImage,
        };

        console.log("[StemCompositionBuilder] Group hierarchy created:", {
            name: rootGroup.name,
            childCount: rootGroup.children.length,
            structure: this.getGroupStructure(rootGroup),
        });

        return rootGroup;
    }

    /**
     * Get or create the group hierarchy for a primitive based on its name
     * e.g., "church/tower/body_main" creates groups "church" and "church/tower"
     * Returns the parent group where the mesh should be added
     * @param primitiveName
     * @param groupMap
     * @param rootGroup
     */
    private static getOrCreateGroupHierarchy(primitiveName: string, groupMap: Map<string, Group>, rootGroup: Group): Group {
        const parts = primitiveName.split("/");

        // If no hierarchy (no "/"), add to root
        if (parts.length <= 1) {
            return rootGroup;
        }

        // Last part is the mesh name, everything before is the group path
        const groupParts = parts.slice(0, -1);

        let currentPath = "";
        let parentGroup = rootGroup;

        for (const part of groupParts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!groupMap.has(currentPath)) {
                // Create new group for this path level
                const newGroup = new Group();
                newGroup.name = part;
                parentGroup.add(newGroup);
                groupMap.set(currentPath, newGroup);
                console.log(`[StemCompositionBuilder] Created group "${part}" at path "${currentPath}"`);
            }

            parentGroup = groupMap.get(currentPath)!;
        }

        return parentGroup;
    }

    /**
     * Get a summary of the group structure for logging
     * @param group
     * @param depth
     */
    private static getGroupStructure(group: Group, depth = 0): string {
        const indent = "  ".repeat(depth);
        let result = `${indent}- ${group.name} (${group.children.length} children)\n`;

        for (const child of group.children) {
            if (child instanceof Group) {
                result += this.getGroupStructure(child, depth + 1);
            } else {
                result += `${indent}  • ${child.name}\n`;
            }
        }

        return result;
    }

    /**
     * Build individual primitive mesh
     * @param primitive - The primitive definition
     * @param index - Index for unique naming
     */
    private static buildPrimitive(primitive: StemPrimitive, index: number): THREE.Mesh | null {
        const [scaleX, scaleY, scaleZ] = primitive.scale;

        try {
            const material = new THREE.MeshStandardMaterial({
                color: primitive.color,
                roughness: primitive.material?.roughness ?? 0.7,
                metalness: primitive.material?.metalness ?? 0.1,
            });

            let mesh: THREE.Mesh;

            // Create geometry and mesh together to maintain proper types
            switch (primitive.type) {
                case "box": {
                    const geometry = new THREE.BoxGeometry(scaleX, scaleY, scaleZ);
                    mesh = new Box(geometry, material);
                    break;
                }
                case "sphere": {
                    // Use scaleX as diameter, divide by 2 for radius
                    const geometry = new THREE.SphereGeometry(scaleX / 2, 32, 16);
                    mesh = new Sphere(geometry, material);
                    break;
                }
                case "cylinder": {
                    // scaleX = diameter (divide by 2 for radius), scaleY = height
                    const geometry = new THREE.CylinderGeometry(scaleX / 2, scaleX / 2, scaleY, 32);
                    mesh = new Cylinder(geometry, material);
                    break;
                }
                case "cone": {
                    // scaleX = diameter (divide by 2 for radius), scaleY = height
                    const geometry = new THREE.ConeGeometry(scaleX / 2, scaleY, 32);
                    mesh = new Cone(geometry, material);
                    break;
                }
                case "plane": {
                    const geometry = new THREE.PlaneGeometry(scaleX, scaleZ);
                    mesh = new Plane(geometry, material);
                    break;
                }
                default:
                    console.warn(`Unknown primitive type: ${primitive.type}`);
                    return null;
            }

            // Use leaf name (last part after "/") for the mesh name
            // e.g., "church/tower/body_main" -> "body_main"
            const fullName = primitive.name || `${primitive.type}_${index}`;
            const leafName = fullName.includes("/") ? fullName.split("/").pop()! : fullName;
            mesh.name = leafName;
            material.name = `${leafName}_material`;

            mesh.position.set(...primitive.position);
            mesh.rotation.set(...primitive.rotation);

            return mesh;
        } catch (error) {
            console.error(`Error building primitive ${primitive.name}:`, error);
            return null;
        }
    }

    /**
     * Preview composition (for debugging)
     * @param composition
     */
    static getCompositionSummary(composition: StemComposition): string {
        const {totalPrimitives, boundingBox} = composition.metadata;
        const types = composition.primitives.map(p => p.type);
        const typeCounts = types.reduce(
            (acc, type) => {
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        );

        return `Erth Composition:
- Primitives: ${totalPrimitives}
- Size: ${boundingBox.width.toFixed(2)}m × ${boundingBox.height.toFixed(2)}m × ${boundingBox.depth.toFixed(2)}m
- Types: ${Object.entries(typeCounts)
            .map(([type, count]) => `${count}x ${type}`)
            .join(", ")}`;
    }
}
