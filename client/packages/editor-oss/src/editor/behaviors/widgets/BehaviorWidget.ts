import BehaviorData from "../../../behaviors/BehaviorData";
interface BehaviorWidget {
    build(name: string, behaviorData: BehaviorData): void;
}

export default BehaviorWidget;
