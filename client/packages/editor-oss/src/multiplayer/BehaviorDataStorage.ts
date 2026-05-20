//behavior data storage
//key: data key
import {MapSchema, Schema} from "@colyseus/schema";

export class BehaviorData extends Schema {
    data = new MapSchema<string>();
}

//key: behaviorId
export class ObjectData extends Schema {
    behaviors = new MapSchema<BehaviorData>();
}
