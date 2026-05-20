import type { COLLISION_TYPE } from "../physics/common/types.js";

export interface CollisionListener {
    id?: string;
    type: COLLISION_TYPE;
    callback: () => void;
}
