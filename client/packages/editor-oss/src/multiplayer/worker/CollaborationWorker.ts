import * as Colyseus from "colyseus.js";

import {SNAPSHOT_EVENTS, BEHAVIOR_EVENTS, ASSET_EVENTS, LAMBDA_EVENTS} from "@stem/editor-oss/physics/common/events";
import {Behavior, GameRoomState, Script} from "../GameRoomState";

/** Minimal client-side Colyseus callback interface not present on @colyseus/schema MapSchema */
interface ClientMapSchema<V> {
    onAdd(callback: (item: V, key: string) => void, triggerAll?: boolean): () => boolean;
    onRemove(callback: (item: V, key: string) => void): () => boolean;
    onChange(callback: (item: V, key: string) => void): () => boolean;
}

/** Minimal client-side Colyseus Schema listen interface not present on @colyseus/schema Schema */
interface ClientSchema {
    listen<K extends string>(prop: K, callback: (value: boolean, previousValue: boolean) => void, immediate?: boolean): () => boolean;
}
export class CollaborationWorker {
    private room?: Colyseus.Room<GameRoomState>;

    constructor(room: Colyseus.Room<GameRoomState>) {
        this.room = room;
    }

    setupRoom(): void {
        if (!this.room) return;

        // --- Snapshot listeners ---
        (this.room.state.snapshot as unknown as ClientMapSchema<string>).onAdd((object: string, key: string) => {
            this.onSnapshotObjectAdd(JSON.parse(object));
        });

        (this.room.state.snapshot as unknown as ClientMapSchema<string>).onRemove((object: string, key: string) => {
            this.onSnapshotObjectRemove(JSON.parse(object));
        });

        (this.room.state.snapshot as unknown as ClientMapSchema<string>).onChange((object: string, key: string) => {
            this.onSnapshotObjectUpdate(JSON.parse(object));
        });

        // --- Behavior listeners ---
        (this.room.state.behaviors as unknown as ClientMapSchema<Behavior>).onAdd((object: Behavior, key: string) => {
            this.onBehaviorAdd(object);
        });

        (this.room.state.behaviors as unknown as ClientMapSchema<Behavior>).onRemove((object: Behavior, key: string) => {
            this.onBehaviorRemove(object);
        });

        (this.room.state.behaviors as unknown as ClientMapSchema<Behavior>).onChange((object: Behavior, key: string) => {
            this.onBehaviorUpdate(object);
        });

        // --- Script listeners ---
        (this.room.state.scripts as unknown as ClientMapSchema<Script>).onAdd((object: Script, key: string) => {
            this.onScriptAdd(object);
        });

        (this.room.state.scripts as unknown as ClientMapSchema<Script>).onRemove((object: Script, key: string) => {
            this.onScriptRemove(object);
        });

        (this.room.state.scripts as unknown as ClientMapSchema<Script>).onChange((object: Script, key: string) => {
            this.onScriptUpdate(object);
        });

        (this.room.state as unknown as ClientSchema).listen("ready", (val: boolean) => {
            if (val) {
                console.log("Collaboration: Service ready");
            }
        });

        this.room.onMessage(ASSET_EVENTS.ADD, (obj: any) => {
            this.onAssetAdd(obj);
        });

        this.room.onMessage(ASSET_EVENTS.REMOVE, (obj: any) => {
            this.onAssetRemove(obj);
        });

        this.room.onMessage(ASSET_EVENTS.UPDATE, (obj: any) => {
            this.onAssetUpdate(obj);
        });

        this.room.onMessage(LAMBDA_EVENTS.REGISTER, (lambda: any) => {
            this.onLambdaAdd(lambda);
        });

        this.room.onMessage(LAMBDA_EVENTS.UNREGISTER, (lambda: any) => {
            this.onLambdaRemove(lambda);
        });

        this.room.onMessage(LAMBDA_EVENTS.UPDATE, (lambda: any) => {
            this.onLambdaUpdate(lambda);
        });
    }

    // --- Snapshot Events ---

    onSnapshotObjectAdd(obj: any): void {
        if (this.room?.state.players.has(obj?.uuid)) {
            console.warn("Collaboration: Object is a player, skipping addition:", obj.uuid);
            return;
        }
        postMessage({event: SNAPSHOT_EVENTS.ADD.OBJECT, object: obj});
    }

    onSnapshotObjectRemove(obj: any): void {
        if (this.room?.state.players.has(obj?.uuid)) {
            console.warn("Collaboration: Object is a player, skipping addition:", obj.uuid);
            return;
        }
        postMessage({event: SNAPSHOT_EVENTS.REMOVE.OBJECT, object: obj});
    }

    onSnapshotObjectUpdate(obj: any): void {
        if (this.room?.state.players.has(obj?.uuid)) {
            console.warn("Collaboration: Object is a player, skipping addition:", obj.uuid);
            return;
        }

        postMessage({event: SNAPSHOT_EVENTS.UPDATE.OBJECT, object: obj});
    }

    // --- Asset Events ---

    onAssetAdd(asset: unknown): void {
        const assetId = (asset as { assetId: string })?.assetId;
        postMessage({event: ASSET_EVENTS.ADD, assetId});
    }

    onAssetRemove(asset: unknown): void {
        const assetId = (asset as { assetId: string })?.assetId;
        postMessage({event: ASSET_EVENTS.REMOVE, assetId});
    }

    onAssetUpdate(asset: unknown): void {
        const assetId = (asset as { assetId: string })?.assetId;
        postMessage({event: ASSET_EVENTS.UPDATE, assetId});
    }

    // --- Behavior Events ---

    onBehaviorAdd(behavior: Behavior): void {
        postMessage({event: BEHAVIOR_EVENTS.REGISTER.BEHAVIOR, behavior});
    }

    onBehaviorRemove(behavior: Behavior): void {
        postMessage({event: BEHAVIOR_EVENTS.UNREGISTER.BEHAVIOR, behavior});
    }

    onBehaviorUpdate(behavior: Behavior): void {
        postMessage({event: BEHAVIOR_EVENTS.UPDATE.BEHAVIOR, behavior});
    }

    // --- Script Events ---

    onScriptAdd(script: Script): void {
        postMessage({event: BEHAVIOR_EVENTS.REGISTER.SCRIPT, script});
    }

    onScriptRemove(script: Script): void {
        postMessage({event: BEHAVIOR_EVENTS.UNREGISTER.SCRIPT, script});
    }

    onScriptUpdate(script: Script): void {
        postMessage({event: BEHAVIOR_EVENTS.UPDATE.SCRIPT, script});
    }

    // --- Lambda Events ---

    onLambdaAdd(lambda: unknown): void {
        postMessage({event: LAMBDA_EVENTS.REGISTER, lambda});
    }

    onLambdaRemove(lambda: unknown): void {
        postMessage({event: LAMBDA_EVENTS.UNREGISTER, lambda});
    }

    onLambdaUpdate(lambda: unknown): void {
        postMessage({event: LAMBDA_EVENTS.UPDATE, lambda});
    }

    // --- Sync Check Methods ---

    /**
     * Collects complete object data from the room
     * Used to verify synchronization with the local scene
     */
    getSyncCheckData(): void {
        if (!this.room?.state) return;

        const objectsData: any[] = [];

        this.room.state.snapshot.forEach(objectStr => {
            try {
                const obj = JSON.parse(objectStr);

                if (this.room?.state.players.has(obj?.uuid)) {
                    return;
                }

                objectsData.push(obj);
            } catch (e) {
                console.error("[CollaborationWorker] Failed to parse object during sync check:", e);
            }
        });

        postMessage({event: SNAPSHOT_EVENTS.SYNC.CHECK_RESPONSE, objectsData});
    }
}
