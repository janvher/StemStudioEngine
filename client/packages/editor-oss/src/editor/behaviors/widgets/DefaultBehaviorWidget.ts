import BehaviorDataManager from "../BehaviorDataManager";
import BehaviorWidget from "./BehaviorWidget";

class DefaultBehaviorWidget implements BehaviorWidget {
    private behaviorDataManager: BehaviorDataManager;

    constructor(behaviorDataManager: BehaviorDataManager) {
        this.behaviorDataManager = behaviorDataManager;
    }

    build(): void {
        // No-op default widget. A real widget would create UI elements from the
        // behavior data using BehaviorDataManager (e.g. destroy behavior on callback).
    }
}

export default DefaultBehaviorWidget;
