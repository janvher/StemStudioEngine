import { 
    Mesh, 
    Object3D,
    InstancedMesh, 
    BufferAttribute, 
    InterleavedBufferAttribute,
    Renderer,
} from "three/webgpu";

import global from "../global";
import MaterialUtils from "./MaterialUtils";
import { isPrefab, isPrefabUnlocked } from '@stem/editor-oss/prefab/util';

interface UUIDNode {
    uuid: string;
    children: UUIDNode[];
}

// @ts-expect-error We are adding a dispose method to Mesh prototype to prevent memory leaks
Mesh.prototype.dispose = function () {

    this.dispatchEvent( { type: 'dispose' } );

};

/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
/**
 * Patches the renderer to handle render object disposal by listening to 'dispose' events on objects.
 * @param renderer - The renderer whose RenderObjects will be patched.
 */
export function patchMesh(renderer: Renderer) {
    // Patch RenderObjects to handle render object disposal

    // @ts-ignore
    if (!renderer._objects) {
        console.warn("Renderer does not have _objects property. Call patchMesh after renderer initialization.");
        return;
    }

    // @ts-ignore
    const RenderObjects = renderer._objects.constructor;
    const createRenderObject = RenderObjects.prototype.createRenderObject as unknown as (...args: any[]) => any;

    if ( createRenderObject.name !== 'patchedCreateRenderObject' ) {

        // @ts-ignore
        RenderObjects.prototype.createRenderObject = function patchedCreateRenderObject( nodes, geometries, renderer, object, material, scene, camera, lightsNode, renderContext, clippingContext, passId ) {

            // @ts-ignore
            const renderObject = createRenderObject.call( this, nodes, geometries, renderer, object, material, scene, camera, lightsNode, renderContext, clippingContext, passId );

            const dispose = renderObject.dispose;
            let isDisposed = false;

            renderObject.dispose = function () {

                if ( isDisposed === true ) return;

                isDisposed = true;

                // @ts-ignore
                dispose.call( this );

            };

            // @ts-ignore
            object.addEventListener( 'dispose', function () {

                renderObject.dispose();

            }, { once: true } );

            return renderObject;

        };

        // @ts-ignore
        const Nodes = renderer._nodes.constructor;

        Nodes.prototype.delete = function (object: any) {

        if ( object.isRenderObject ) {

                const nodeBuilderState = this.get( object ).nodeBuilderState;

                if ( !nodeBuilderState ) {

                    return;

                }

                nodeBuilderState.usedTimes --;

                if ( nodeBuilderState.usedTimes === 0 ) {

                    this.nodeBuilderCache.delete( this.getForRenderCacheKey( object ) );

                }

            }

            return Object.getPrototypeOf(Nodes.prototype).delete.call(this, object);

        };

    }
}
/* eslint-enable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */

/**
 * Mesh utility class for handling 3D model operations
 */
const MeshUtils = {
    /**
     * Type guard to check if an object is a Mesh
     * @param obj - The object to check
     * @returns True if the object is a Mesh
     */
    isMesh(obj: Object3D): obj is Mesh {
        return (obj as Mesh).isMesh;
    },

    /**
     * Type guard to check if an object is an InstancedMesh
     * @param obj - The object to check
     * @returns True if the object is an InstancedMesh
     */
    isInstancedMesh(obj: Object3D): obj is InstancedMesh {
        return (obj as InstancedMesh).isInstancedMesh;
    },

    /**
     * Type guard to check if an attribute is a BufferAttribute
     * @param attr - The attribute to check
     * @returns True if the attribute is a BufferAttribute
     */
    isBufferAttribute(attr: any): attr is BufferAttribute {
        return attr && attr.isBufferAttribute;
    },

    /**
     * Type guard to check if an attribute is an InterleavedBufferAttribute
     * @param attr - The attribute to check
     * @returns True if the attribute is an InterleavedBufferAttribute
     */
    isInterleavedBufferAttribute(attr: any): attr is InterleavedBufferAttribute {
        return attr && attr.isInterleavedBufferAttribute;
    },

    /**
     * Traverse model children to get a list of UUIDs
     * @param children - Array of Object3D children
     * @param list - Array to store UUID nodes
     */
    traverseUUID(children: Object3D[], list: UUIDNode[]): void {
        for (let i = 0; i < children.length; i++) {
            const child = children[i]!;

            let list1: UUIDNode[] = [];

            if (child.children && child.children.length > 0) {
                this.traverseUUID(child.children, list1);
            }

            list.push({
                uuid: child.uuid,
                children: list1,
            });
        }
    },

    /**
     * Get the complete model from a model component
     * @param obj - A part of the model to get the complete model from
     * @returns The complete model
     */
    partToMesh(obj: Object3D): Object3D {
        const scene = global.app?.editor?.scene;
        if (!scene) {
            return obj;
        }

        if (obj === scene || obj.userData && obj.userData.Server === true) {
            // Scene or server-side model
            return obj;
        }

        // Check if obj is part of a prefab. If so, get the top-most prefab
        // that contains obj. Ignore prefabs that are unlocked for editing.
        let current: Object3D | null = obj;
        let topmostPrefab: Object3D | null = null;

        while (current) {
            if (isPrefab(current) && !isPrefabUnlocked(current)) {
                topmostPrefab = current;
            }

            current = current.parent;
        }

        if (topmostPrefab) {
            return topmostPrefab;
        }

        // Check if obj is part of a model
        current = obj;
        let isPart = false;

        while (current) {
            if (current === scene) {
                break;
            }
            if (current.userData && !!current.userData.isStemObject) {
                isPart = true;
                break;
            }

            current = current.parent;
        }

        if (isPart && current) {
            return current;
        }

        return obj;
    },

    /**
     * Disposes all GPU-bound resources of a mesh:
     * geometries, BVH trees, buffer attributes, index buffers,
     * InstancedMesh instance attributes,
     * materials, textures, and any textures within uniforms.
     *
     * @param {THREE.Object3D} mesh - The object whose GPU resources (and those of its children) will be freed.
     */
    dispose(mesh: Object3D): void {
        if (!this.isMesh(mesh)) {
            (mesh as any).dispose?.();

            // @ts-expect-error Dispatch dispose event just in case some class has dispose but do not properly dispatches the event
            mesh.dispatchEvent( { type: 'dispose' } );
            return;
        }

        // Dispose geometry and GPU buffers
        if (mesh.geometry) {
            const geom = mesh.geometry;
            // BVH from three-mesh-bvh
            geom.disposeBoundsTree?.();
            geom.dispose();
        }

        // Dispose materials and textures
        const materials = Array.isArray(mesh.material)
            ? mesh.material
            : mesh.material
            ? [mesh.material]
            : [];
        for (const material of materials) {
            if (!material?.dispose) continue;
            // Standard texture slots
            [
                'map', 'lightMap', 'aoMap', 'emissiveMap', 'bumpMap', 'normalMap',
                'displacementMap', 'roughnessMap', 'metalnessMap', 'alphaMap',
                'envMap', 'specularMap', 'gradientMap',
            ].forEach(slot => {
                const texture = (material as any)[slot];
                if (MaterialUtils.isTexture(texture)) {
                    texture.dispose();
                }
            });
            material.dispose();
        }

        (mesh as any).dispose?.();

        // @ts-expect-error Dispatch dispose event just in case some class has dispose but do not properly dispatches the event
        mesh.dispatchEvent( { type: 'dispose' } );
    },
};

export default MeshUtils;
