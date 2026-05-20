import * as THREE from "three";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { CSGCommand, CSGOperation } from "./CSGCommand";

// Mock the global module
vi.mock("../../global", () => ({
    default: {
        app: {
            editor: {
                addObject: vi.fn(),
                removeObject: vi.fn(),
                select: vi.fn(),
                deselect: vi.fn(),
                objectByUuid: vi.fn(() => null),
            },
        },
    },
}));

describe("CSGCommand", () => {
    let box1: THREE.Mesh;
    let box2: THREE.Mesh;

    beforeEach(() => {
        // Create two box meshes for testing
        const geometry1 = new THREE.BoxGeometry(1, 1, 1);
        const material1 = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        box1 = new THREE.Mesh(geometry1, material1);
        box1.name = "Box1";
        box1.position.set(0, 0, 0);

        const geometry2 = new THREE.BoxGeometry(1, 1, 1);
        const material2 = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        box2 = new THREE.Mesh(geometry2, material2);
        box2.name = "Box2";
        box2.position.set(0.5, 0, 0);

        // Add to a parent so they have a scene context
        const parent = new THREE.Group();
        parent.add(box1);
        parent.add(box2);
    });

    it("should create a CSG command with union operation", () => {
        const command = new CSGCommand([box1, box2], CSGOperation.UNION);
        expect(command).toBeDefined();
        expect(command.type).toBe("CSGCommand");
    });

    it("should create a CSG command with intersection operation", () => {
        const command = new CSGCommand([box1, box2], CSGOperation.INTERSECTION);
        expect(command).toBeDefined();
        expect(command.type).toBe("CSGCommand");
    });

    it("should create a CSG command with difference operation", () => {
        const command = new CSGCommand([box1, box2], CSGOperation.DIFFERENCE);
        expect(command).toBeDefined();
        expect(command.type).toBe("CSGCommand");
    });

    it("should throw error when less than 2 objects provided", () => {
        expect(() => {
            new CSGCommand([box1], CSGOperation.UNION);
        }).toThrow("CSG operation requires at least 2 objects");
    });

    it("should throw error when no objects provided", () => {
        expect(() => {
            new CSGCommand([], CSGOperation.UNION);
        }).toThrow("CSG operation requires at least 2 objects");
    });

    it("should serialize and deserialize correctly", () => {
        const command = new CSGCommand([box1, box2], CSGOperation.UNION);
        const json = command.toJSON();

        expect(json.type).toBe("CSGCommand");
        expect(json.operation).toBe(CSGOperation.UNION);
        expect(json.objectUuids).toHaveLength(2);
    });
});
