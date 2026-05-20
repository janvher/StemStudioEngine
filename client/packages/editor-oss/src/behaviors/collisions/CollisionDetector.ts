import * as THREE from "three";

import type Ammo from "ammo";
import {CollisionData, ICollisionSource, IPhysics} from "../../physics/common/types";
import {COLLISION_TYPE} from "@stem/editor-oss/types/editor";
import {IControl} from "../game/GameManager";

export interface CollisionListener {
    id?: string;
    type: COLLISION_TYPE;
    useBoundingBoxes?: boolean;
    distanceThreshold?: number;
    callback: () => void;
}

/**
 * This class does both physics and distance base collision detection.
 */
class CollisionDetector {
    static readonly DEFAULT_COLLISION_THRESHOLD = 3.5;

    physics: IPhysics;
    player?: THREE.Object3D;
    control?: IControl;
    world?: Ammo.btDiscreteDynamicsWorld;
    objBox = new THREE.Box3();
    targetBox = new THREE.Box3();
  
    private objectsWithoutPhysics: Map<THREE.Object3D, CollisionListener[]> = new Map<
        THREE.Object3D,
        CollisionListener[]
    >();
    private objectsWithPhysics: Map<THREE.Object3D, CollisionListener[]> = new Map<
        THREE.Object3D,
        CollisionListener[]
    >();
    private uuidToObjects: Map<string, THREE.Object3D> = new Map<string, THREE.Object3D>();

    private lastCollisionsViaPhysics: CollisionData[] = [];

    constructor(physics: IPhysics, collisionSource: ICollisionSource) {
        this.physics = physics;
        //subscribe for physics collision events
        collisionSource.addCollisionListener(collision => {
            this.onCollisionViaPhysics(collision);
        });
    }

    setPlayer(player: THREE.Object3D | undefined) {
        this.player = player;
    }

    addListener(target: THREE.Object3D, listener: CollisionListener, usePhysics: boolean): string {
        const map = usePhysics ? this.objectsWithPhysics : this.objectsWithoutPhysics;
        let arr = map.get(target);
        if (!arr) {
            arr = [];
            map.set(target, arr);
        }
        if (!listener.id) {
            listener.id = THREE.MathUtils.generateUUID();
        }
        arr.push(listener);
        if (usePhysics) {
            this.physics.detectCollisionsForObject(target.uuid, {id: listener.id, type: listener.type}, true);
            this.uuidToObjects.set(target.uuid, target);
        }
        return listener.id;
    }

    deleteListener(target: THREE.Object3D, listenerId: string = ""): void {
        [this.objectsWithPhysics, this.objectsWithoutPhysics].forEach(map => {
            if (listenerId) {
                let arr = map.get(target);
                if (arr && arr.length > 0) {
                    arr = arr.filter(e => e.id !== listenerId);
                    map.set(target, arr);
                }
            } else {
                map.delete(target);
            }
        });
        this.physics.detectCollisionsForObject(target.uuid, {id: listenerId, type: COLLISION_TYPE.UNKNOWN}, false);
        this.uuidToObjects.delete(target.uuid);
    }

    isColliding(
        obj: THREE.Object3D,
        target: THREE.Object3D,
        useBoundingBoxes: boolean,
        distanceThreshold = CollisionDetector.DEFAULT_COLLISION_THRESHOLD,
        debug = false,
    ) {
        if (useBoundingBoxes) {
            this.objBox = new THREE.Box3().setFromObject(obj);
            this.targetBox = new THREE.Box3().setFromObject(target);
            const isIntersecting = this.objBox.intersectsBox(this.targetBox);
            if (target === this.player) {
                obj.userData.isCollidingWithPlayer = isIntersecting;
            }
            if (debug) {
                console.log("isColliding.useBoundingBoxes", this.objBox, this.targetBox, isIntersecting);
            }
            return isIntersecting;
        }

        // TODO: use SAT for more accurate collision detection or leave only bounding boxes collision and use physics for more complex cases
        //try by distance by default
        const distance = obj.position.distanceTo(target.position);
        const collisionThreshold = distanceThreshold || obj.userData.collision_sensitivity;
        if (debug) {
            console.log("isColliding.useDistance", distance, collisionThreshold, distance <= collisionThreshold);
        }
        return distance <= collisionThreshold;
    }

    update() {
        if (this.objectsWithPhysics.size > 0) {
            this.detectCollisionViaPhysics();
        }
        if (this.objectsWithoutPhysics.size > 0) {
            this.detectCollisionViaDistance();
        }
    }

    private detectCollisionViaDistance() {
        [this.objectsWithoutPhysics, this.objectsWithPhysics].forEach(map => {
            map.forEach((listenerArr, obj) => {
                listenerArr.forEach(listener => {
                    //FIXME: can be further optimized
                    if (listener.type === COLLISION_TYPE.WITH_PLAYER) {
                        if (!this.player) return;
                        if (
                            this.isColliding(obj, this.player, !!listener.useBoundingBoxes, listener.distanceThreshold)
                        ) {
                            listener.callback();
                        }
                    } else {
                        console.warn("Unsupported collision type: "+listener.type);
                    }
                });
            });
        });
    }

    private detectCollisionViaPhysics() {
        this.lastCollisionsViaPhysics.forEach(collision => {
            let target = this.uuidToObjects.get(collision.uuid);
            if (target) {
                let arr = this.objectsWithPhysics.get(target);
                if (arr && arr.length > 0) {
                    let listener = arr.find(l => l.id === collision.listenerId);
                    if (listener) {
                        listener.callback();
                    } else {
                        console.warn("detectCollisionViaPhysics failed to get listener: " + collision.listenerId);
                    }
                }
            } else {
                console.warn("detectCollisionViaPhysics failed to get object by uuid: " + collision.uuid);
            }
        });
        this.lastCollisionsViaPhysics.length = 0;
    }

    private onCollisionViaPhysics(collision: CollisionData) {
        this.lastCollisionsViaPhysics.push(collision);
    }
}

export default CollisionDetector;
