import {Object3D} from "three";

/**
 * A handler registered with SceneTraverser.
 * `test` is called for every visible node; if it returns true, the node
 * is appended to the handler's results array.
 */
export interface TraversalHandler<T extends Object3D = Object3D> {
    /** Return true to collect this node. */
    test(node: T): boolean;
    /** Accumulated results for the current frame. Cleared at the start of each update(). */
    results: T[];
}

export default class SceneTraverser {
    private root: Object3D;
    private skipRoots: Set<Object3D> = new Set();
    private handlers: TraversalHandler<any>[] = [];

    constructor(root: Object3D) {
        this.root = root;
    }

    /**
     * Register a handler whose `test` is called for every visible node each frame.
     * @param handler
     */
    addHandler<T extends Object3D>(handler: TraversalHandler<T>): void {
        if (!this.handlers.includes(handler)) {
            this.handlers.push(handler);
        }
    }

    removeHandler(handler: TraversalHandler<any>): void {
        const idx = this.handlers.indexOf(handler);
        if (idx !== -1) this.handlers.splice(idx, 1);
    }

    /**
     * Subtrees rooted at these objects are skipped during traversal (e.g. batchRoot).
     * @param root
     */
    addSkipRoot(root: Object3D): void {
        this.skipRoots.add(root);
    }

    removeSkipRoot(root: Object3D): void {
        this.skipRoots.delete(root);
    }

    update(force = false): void {
        const handlers = this.handlers;
        for (let i = 0; i < handlers.length; i++) {
            handlers[i]!.results.length = 0;
        }
        this.traverse(this.root, force, false);
    }

    private traverse(node: Object3D, force: boolean, skipMatrixUpdate: boolean): void {
        if (!node.visible) return;
        let localForce = force;
        let skipChildMatrixUpdate = skipMatrixUpdate;

        if (!skipMatrixUpdate) {
            if (node.updateMatrixWorld !== Object3D.prototype.updateMatrixWorld) {
                node.updateMatrixWorld(force);
                skipChildMatrixUpdate = true;
            } else {
                if (node.matrixAutoUpdate) node.updateMatrix();
                if (node.matrixWorldNeedsUpdate || force) {
                    if (node.matrixWorldAutoUpdate === true) {
                        if (node.parent === null) node.matrixWorld.copy(node.matrix);
                        else node.matrixWorld.multiplyMatrices(node.parent.matrixWorld, node.matrix);
                    }
                    node.matrixWorldNeedsUpdate = false;
                    localForce = true;
                }
            }
        }

        // Run all handlers against this visible node
        const handlers = this.handlers;
        for (let i = 0; i < handlers.length; i++) {
            const h = handlers[i]!;
            if (h.test(node)) {
                h.results.push(node);
            }
        }

        const children = node.children;
        for (let i = 0, l = children.length; i < l; i++) {
            const child = children[i];
            if (child === undefined) continue;
            if (this.skipRoots.has(child)) continue;
            this.traverse(child, localForce, skipChildMatrixUpdate);
        }
    }
}
