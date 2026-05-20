import { MapSchema, Schema, type } from "@colyseus/schema";

//behavior data storage
//key: data key
export class BehaviorData extends Schema {
    @type({ map: "string" }) data = new MapSchema<string>();
}

//key: behaviorId
export class ObjectData extends Schema {
    @type({ map: BehaviorData }) behaviors = new MapSchema<BehaviorData>();
}

//key-value pair storage for behavior data
//key = object.uuid
export class BehaviorDataStorage {

    private objects: MapSchema<ObjectData>;

    constructor(objects: MapSchema<ObjectData>) {
        this.objects = objects;
    }

    setData(uuid: string, behaviorId: string, key: string, data: string) {
        if (typeof data !== "string" || !behaviorId || !key || !data) {
            console.warn(`Set behavior data supports string values only and values can't be null: ${behaviorId} -> ${key} -> ${data} -> ${typeof data}`);
            return;
        }

        let objectData = this.objects.get(uuid);
        if (!objectData) {
            objectData = new ObjectData();
            this.objects.set(uuid, objectData);
        }
        let behaviorData = objectData.behaviors.get(behaviorId);
        if (!behaviorData) {
            behaviorData = new BehaviorData();
            objectData.behaviors.set(behaviorId, behaviorData);
        }
        behaviorData.data.set(key, data);
    }

    removeData(uuid: string, behaviorId: string, key: string) {
        let objectData = this.objects.get(uuid);
        if (!objectData) return;
        let behaviorData = objectData.behaviors.get(behaviorId);
        if (!behaviorData) return;
        behaviorData.data.delete(key);
    }

    removeObject(uuid: string) {
        this.objects.delete(uuid);
    }
}
