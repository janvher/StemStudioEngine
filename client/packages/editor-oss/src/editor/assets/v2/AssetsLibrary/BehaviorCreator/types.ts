import {BehaviorAttributeBase} from "../../../../behaviors/BehaviorAttributes";
import {BehaviorConfig} from "../../../../behaviors/BehaviorConfig";

export interface IAttribute extends BehaviorAttributeBase {
    [key: string]: any;
    key: string;
}

export interface BehaviorCreatorProps {
    isCreatingNewBehavior: boolean;
    isSceneBehavior: boolean;
    config?: BehaviorConfig;
    script?: string;
    fileId?: string; // file id to open in editor
    newBehaviorData?: INewBehaviorData;
    onPopOut?: () => void;
    onDirtyChange?: (dirty: boolean) => void;
}

export const DEFAULT_BEHAVIOR_CONFIG: BehaviorConfig = {
    id: "",
    name: "",
    description: "",
    version: "1.0.0",
    isScript: true,
    attributes: {},
    author: "",
    main: "",
    tags: [],
    dependencies: {},
    objectSettings: {},
};

export interface INewBehaviorData {
    name: string;
    description?: string;
}
