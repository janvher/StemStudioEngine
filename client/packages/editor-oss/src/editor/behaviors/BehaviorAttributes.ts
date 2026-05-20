import BehaviorAttributeType from "./BehaviorAttributeType";
import {AssetRef} from "@stem/editor-oss/asset-management/AssetRef";

/**
 * VisibilityCondition is a data structure that is used to determine if an attribute should be visible
 * It's a key-value pair where key is an attribute name and value is a value that the attribute should have
 * If the attribute has the value, it should be visible
 */
export type VisibilityCondition = {
    [attributeName: string]: string | number | boolean | Array<string | number | boolean>;
};

/**
 * BehaviorAttributeData is data from behavior.json file
 * It contains all the information needed to create a BehaviorAttribute
 * As well as autoFill data and other additional data
 */
export type BehaviorAttributeData = BehaviorAttributeBase & {
    template?: string; // reference to attributeTemplate by key
    visibleIf?: VisibilityCondition;
    [key: string]: any;
};

/**
 * Convinient shorthand for a Record<string, BehaviorAttributeData>
 */
export type BehaviorAttributes = Record<string, BehaviorAttribute>;

/**
 * BehaviorAttribute is a data structure that is used in the editor
 * It contains all and ready to use information needed to create a UI for the attribute
 * It's created using BehaviorAttributeData and filled with additional data
 */
export type BehaviorAttribute =
    | EnumAttribute
    | NumberAttribute
    | BooleanAttribute
    | StringAttribute
    | Vector2Attribute
    | Vector3Attribute
    | ObjectAttribute
    | ImageAttribute
    | SliderAttribute
    | GroupAttribute
    | VideoAttribute
    | ButtonAttribute
    | ModelPreviewAttribute
    | ModelAssetAttribute;

export type BehaviorAttributeBase = {
    name: string;
    type: BehaviorAttributeType | string;
    width?: string;
    array: boolean;
    invisible: boolean;
    userVisible?: boolean; // controls whether the attribute is shown to the user on the right panel (default true)
    visibleIf?: VisibilityCondition;
    default: any;
    defaultSandbox?: any; // if set, overrides default value when in sandbox mode
    order: number;
};

export type EnumAttribute = BehaviorAttributeBase & {
    options: {label: string; value: string}[];
};

export type ObjectAttribute = BehaviorAttributeBase & {
    options: {name: string; uuid: string}[];
    /** Filter type: "mesh" to only show mesh objects */
    filter?: string;
};

export type PrefabAttribute = BehaviorAttributeBase & {
    optionsPromise: Promise<{name: string; assetRef: AssetRef}[]>;
};

export type AssetAttribute = BehaviorAttributeBase & {
    optionsPromise: Promise<{name: string; assetRef: AssetRef}[]>;
};

export type ModelAssetAttribute = AssetAttribute;
export type ImageAssetAttribute = AssetAttribute;
export type AudioAssetAttribute = AssetAttribute;
export type VideoAssetAttribute = AssetAttribute;

export type ObjectBehaviorsAttribute = BehaviorAttributeBase & {
    object: {name: string; uuid: string}[]; // object to which the behaviors are attached
    behaviors: {name: string; id: string}[]; // activated behaviors
    filterByAttributes?: Record<string, string>;
    defaultToSelf?: boolean; // if true, default object is the object the behavior is attached to
    selectAllByDefault?: boolean; // if true, all behaviors are selected by default
    targetEntity?: "behavior" | "lambda"; // controls which component type is listed
};

export type NumberAttribute = BehaviorAttributeBase & {
    min: number;
    max: number;
    /** Step increment for drag and arrow keys (also determines decimal places) */
    step?: number;
};

export type SliderAttribute = BehaviorAttributeBase & {
    min: number;
    max: number;
    step: number;
};

export type BooleanAttribute = BehaviorAttributeBase & {
    isExclusive?: boolean; // for checkboxes that are exclusive within all behaviors (e.g. isDefault character)
};

export type StringAttribute = BehaviorAttributeBase & {
    isColumnMultiline?: boolean;
    /** If true, the text field is read-only */
    readOnly?: boolean;
};

export type Vector2Attribute = BehaviorAttributeBase & {
    min?: {x: number; y: number};
    max?: {x: number; y: number};
};

export type Vector3Attribute = BehaviorAttributeBase & {
    min?: {x: number; y: number; z: number};
    max?: {x: number; y: number; z: number};
};

export type ImageAttribute = BehaviorAttributeBase & {};

export type VideoAttribute = BehaviorAttributeBase & {
    options: {label: string; value: string}[];
};

export type ArrayAttribute = BehaviorAttributeBase & {};

export type GroupAttribute = BehaviorAttributeBase & {
    attributes: Record<string, BehaviorAttribute>;
    presets?: {name: string; values: Record<string, BehaviorAttributeData>}[];
    addItemLabel?: string;
    itemLabel?: string;
    /** When set on an array group, auto-normalizes this numeric field across items to sum to max */
    normalizeField?: string;
};

export type ButtonAttribute = BehaviorAttributeBase & {
    action: "buttonClicked" | "resetToDefaults" | string;
    buttonText?: string;
};

export type ModelPreviewAttribute = BehaviorAttributeBase & {
    /** Field name to read the model URL from (within the same group) */
    urlField?: string;
    /** Field name to read the model UUID from (for scene objects) */
    uuidField?: string;
    /** Fixed width/height for the preview in pixels */
    size?: number;
};
