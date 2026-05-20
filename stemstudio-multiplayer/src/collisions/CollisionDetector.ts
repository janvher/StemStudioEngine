import { randomUUID } from "crypto";
import type { CollisionData, IPhysics } from "../physics/common/types.js";
import { COLLISION_TYPE } from "../physics/common/types.js";
import type { CollisionListener } from "./CollisionTypes.js";

export default class CollisionDetector {
    private physics: IPhysics;
    private collisionCallbacks: Map<string, CollisionListener[]> = new Map<
        string,
        CollisionListener[]
    >();
    players: string[] = [];

    constructor(physics: IPhysics) {
        this.physics = physics;
    }

    addPlayer(player: string) {
        this.players.push(player);
    }

    deletePlayer(playerUuid: string) {
        this.players = this.players.filter(player => player !== playerUuid);
    }

    addListener(target: string, listener: CollisionListener): string {
        const callbacks = this.collisionCallbacks;
        let arr = callbacks.get(target);
        if (!arr) {
            arr = [];
            callbacks.set(target, arr);
        }
        if (listener.id === null || listener.id === "") {
            listener.id = randomUUID();
        }
        arr.push(listener);
        this.physics.detectCollisionsForObject(target, {id: listener.id, type: listener.type}, true);
        return listener.id;
    }

    deleteListener(target: string, listenerId: string = ""): void {
        [this.collisionCallbacks].forEach(map => {
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
        this.physics.detectCollisionsForObject(target, {id: listenerId, type: COLLISION_TYPE.UNKNOWN}, false);
    }

    public onCollisionViaPhysics(collision: CollisionData) {
        const arr = this.collisionCallbacks.get(collision.uuid);
        if (arr && arr.length > 0) {
            const listener = arr.find(l => l.id === collision.listenerId);
            if (listener) {
                listener.callback();
            } else {
                console.warn("detectCollisionViaPhysics failed to get listener: " + collision.listenerId);
            }
        }
    }
}
