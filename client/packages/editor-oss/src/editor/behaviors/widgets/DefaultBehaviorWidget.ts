import BehaviorData from "../../../behaviors/BehaviorData";
import BehaviorDataManager from "../BehaviorDataManager";
import BehaviorWidget from "./BehaviorWidget";

class DefaultBehaviorWidget implements BehaviorWidget {
    private behaviorDataManager: BehaviorDataManager;

    constructor(behaviorDataManager: BehaviorDataManager) {
        this.behaviorDataManager = behaviorDataManager;
    }

    build(name: string, behaviorData: BehaviorData): void {
        // console.log(`Building UI for "${name}" with data:`, behaviorData);
        // you can create UI elements or perform other actions based on the behavior data using BehaviorDataManager
        // for example destroy behavior on callback
    }
}

export default DefaultBehaviorWidget;
