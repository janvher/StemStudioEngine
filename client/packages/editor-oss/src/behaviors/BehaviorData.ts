// TODO: version?

import { Object3D } from "three";

import {BehaviorThrottleConfig} from "./Behavior";

// This data is saved and loaded from user data and scene file
interface BehaviorData {
    id: string;
    uuid: string;
    /** The uuid of the corresponding behavior in the prefab */
    prefabBehaviorUuid?: string;
    enabled: boolean;
    priority: number;
    attributesData?: Record<string, any>;
    throttleConfig?: BehaviorThrottleConfig;
    target?: Object3D;
}

export default BehaviorData;
