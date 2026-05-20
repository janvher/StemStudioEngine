/**
 * THREE.js Type Subset for Behavior Scripts
 * This file is imported as a raw string for Monaco Editor IntelliSense
 */

declare namespace THREE {
    interface Vector3 {
        x: number;
        y: number;
        z: number;
        set(x: number, y: number, z: number): this;
        add(v: Vector3): this;
        sub(v: Vector3): this;
        multiply(v: Vector3): this;
        multiplyScalar(scalar: number): this;
        length(): number;
        normalize(): this;
        distanceTo(v: Vector3): number;
        copy(v: Vector3): this;
        clone(): Vector3;
    }

    interface Quaternion {
        x: number;
        y: number;
        z: number;
        w: number;
        set(x: number, y: number, z: number, w: number): this;
        setFromEuler(euler: Euler): this;
        copy(q: Quaternion): this;
        clone(): Quaternion;
    }

    interface Euler {
        x: number;
        y: number;
        z: number;
        order: string;
        set(x: number, y: number, z: number, order?: string): this;
    }

    interface Object3D {
        position: Vector3;
        rotation: Euler;
        scale: Vector3;
        quaternion: Quaternion;
        uuid: string;
        name: string;
        visible: boolean;
        parent: Object3D | null;
        children: Object3D[];
        userData: any;
        add(...object: Object3D[]): this;
        remove(...object: Object3D[]): this;
        getWorldPosition(target: Vector3): Vector3;
        getWorldQuaternion(target: Quaternion): Quaternion;
        lookAt(x: number | Vector3, y?: number, z?: number): void;
        traverse(callback: (object: Object3D) => void): void;
        traverseVisible(callback: (object: Object3D) => void): void;
    }

    interface Mesh extends Object3D {
        geometry: any;
        material: any;
    }

    interface Scene extends Object3D {
        background: any;
        environment: any;
    }

    interface Camera extends Object3D {
        aspect: number;
        near: number;
        far: number;
        fov: number;
    }
}
