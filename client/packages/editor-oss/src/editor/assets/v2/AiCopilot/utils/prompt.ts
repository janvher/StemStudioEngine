import type {Object3D, Scene} from "three";

import global from "@stem/editor-oss/global";

// Token limit for AI Copilot prompts
export const MAX_PROMPT_TOKENS = 200000;
export const CHARS_PER_TOKEN = 2.5;

// Maximum characters in serialized objects context
export const MAX_SERIALIZED_CHARS = Math.floor(MAX_PROMPT_TOKENS * CHARS_PER_TOKEN * 0.05); // 5% of limit for focused attached-object context

/**
 * Estimate token count from text length
 * @param text Text to estimate
 * @returns Estimated token count
 */
export const estimateTokenCount = (text: string): number => {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
};

/**
 * Calculate size of serialized objects in characters.
 * Note: Objects should already be optimized with serializeObjectForAI before passing here.
 * @param serializedObjects Array of already optimized serialized objects
 * @returns Total character count
 */
export const calculateSerializedSize = (serializedObjects: unknown[]): number => {
    try {
        const jsonString = JSON.stringify(serializedObjects);
        return jsonString.length;
    } catch (error) {
        console.error("Failed to calculate serialized size:", error);
        return 0;
    }
};

/**
 * Calculate estimated size after adding a new object.
 * Note: newObject should already be optimized with serializeObjectForAI.
 * @param currentObjects Current array of optimized serialized objects
 * @param newObject New optimized serialized object to add
 * @returns Estimated total character count
 */
export const estimateSizeWithNewObject = (currentObjects: unknown[], newObject: unknown): number => {
    try {
        const combined = [...currentObjects, newObject];
        return calculateSerializedSize(combined);
    } catch (error) {
        console.error("Failed to estimate size with new object:", error);
        return 0;
    }
};

/**
 * Check if adding an object would exceed the size limit.
 * Note: All objects should already be optimized with serializeObjectForAI.
 * @param currentObjects Current array of optimized serialized objects
 * @param newObject New optimized serialized object to add
 * @returns True if within limit, false if exceeds
 */
export const canAddObject = (currentObjects: unknown[], newObject: unknown): boolean => {
    const estimatedSize = estimateSizeWithNewObject(currentObjects, newObject);
    return estimatedSize <= MAX_SERIALIZED_CHARS;
};

/**
 * Get formatted size information
 * @param charCount Character count
 * @returns Formatted size info
 */
export const formatSizeInfo = (charCount: number): {chars: number; tokens: number; percentage: number} => {
    const tokens = estimateTokenCount(String(charCount));
    const percentage = charCount / MAX_SERIALIZED_CHARS * 100;
    return {
        chars: charCount,
        tokens: tokens,
        percentage: Math.round(percentage * 10) / 10,
    };
};

/**
 * Build optimized context from already summarized attached objects.
 * @param serializedObjects
 */
export const buildOptimizedContext = (serializedObjects: unknown[]): {attachedObjects?: unknown[]; metadata?: unknown} => {
    if (serializedObjects.length === 0) {
        return {};
    }

    return {
        attachedObjects: serializedObjects,
        metadata: {
            objectCount: serializedObjects.length,
        },
    };
};

export type StructuredSceneSummaryObject = {
    name: string;
    uuid: string;
    type: string;
    childCount: number;
    behaviorCount: number;
    physics: boolean;
};

export type StructuredSceneSummary = {
    rootCount: number;
    totalObjectCount: number;
    topObjectTypes: Array<{type: string; count: number}>;
    selectedObjects: StructuredSceneSummaryObject[];
    highSalienceObjects: StructuredSceneSummaryObject[];
    behaviorCount: number;
    physicsCount: number;
};

type EditorSceneApp = {
    editor?: {
        scene?: Scene;
        selected?: Object3D | Object3D[] | null;
    };
    scene?: Scene;
};

function getEditorSceneApp(): EditorSceneApp | undefined {
    return global.app as unknown as EditorSceneApp | undefined;
}

function getObjectBehaviorCount(object: Object3D): number {
    const behaviorValues = [
        object.userData?.behaviors,
        object.userData?.Behaviors,
        object.userData?.behaviorIds,
        object.userData?.BehaviorIDs,
    ];
    for (const value of behaviorValues) {
        if (Array.isArray(value)) return value.length;
        if (value && typeof value === "object") return Object.keys(value).length;
    }
    return 0;
}

function hasPhysics(object: Object3D): boolean {
    const physics = object.userData?.physics || object.userData?.Physics;
    if (!physics || typeof physics !== "object") return false;
    return physics.enabled !== false;
}

function summarizeObject(object: Object3D): StructuredSceneSummaryObject {
    return {
        name: object.name || object.type || "Object3D",
        uuid: object.uuid,
        type: object.type,
        childCount: object.children.length,
        behaviorCount: getObjectBehaviorCount(object),
        physics: hasPhysics(object),
    };
}

function getSelectedObjects(selected: Object3D | Object3D[] | null | undefined): Object3D[] {
    if (!selected) return [];
    return Array.isArray(selected) ? selected.filter(Boolean) : [selected];
}

/**
 * Build a small, structured scene summary for intent-gated Copilot context.
 * This intentionally avoids full object serialization; detailed data remains available through scene tools.
 */
export const buildStructuredSceneSummary = (
    scene?: Scene,
    selected?: Object3D | Object3D[] | null,
): StructuredSceneSummary | null => {
    const app = getEditorSceneApp();
    const resolvedScene = scene || app?.editor?.scene || app?.scene;
    const resolvedSelected = selected === undefined ? app?.editor?.selected : selected;
    if (!resolvedScene) return null;

    const rootObjects = resolvedScene.children.filter(object => object.visible !== false);
    const typeCounts = new Map<string, number>();
    let totalObjectCount = 0;
    let behaviorCount = 0;
    let physicsCount = 0;

    resolvedScene.traverse(object => {
        if (object === resolvedScene) return;
        totalObjectCount += 1;
        typeCounts.set(object.type, (typeCounts.get(object.type) || 0) + 1);
        behaviorCount += getObjectBehaviorCount(object);
        if (hasPhysics(object)) {
            physicsCount += 1;
        }
    });

    const selectedObjects = getSelectedObjects(resolvedSelected).slice(0, 8).map(summarizeObject);
    const selectedUUIDs = new Set(selectedObjects.map(object => object.uuid));
    const highSalienceObjects = rootObjects
        .filter(object => !selectedUUIDs.has(object.uuid))
        .slice(0, 8)
        .map(summarizeObject);

    return {
        rootCount: rootObjects.length,
        totalObjectCount,
        topObjectTypes: Array.from(typeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([type, count]) => ({type, count})),
        selectedObjects,
        highSalienceObjects,
        behaviorCount,
        physicsCount,
    };
};
