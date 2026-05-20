import * as THREE from "three";

/**
 * Replace base64 encoded images with placeholders to reduce token usage
 * Checks all string values in the object, regardless of structure or field name
 * @param obj Object to process (will be modified in-place)
 * @returns Modified object with image data replaced by placeholders
 */
export const replaceBase64ImagesWithPlaceholders = (obj: unknown): unknown => {
    if (!obj || typeof obj !== "object") {
        return obj;
    }

    // Use a Set to track processed objects and avoid circular references
    const processed = new WeakSet<object>();

    const processValue = (value: unknown): unknown => {
        // Check if this is a string with base64 data URI
        if (typeof value === "string" && value.startsWith("data:image/")) {
            // Extract format from data URI (e.g., "data:image/png;base64,...")
            const formatMatch = value.match(/^data:image\/([^;,]+)/);
            const format = formatMatch ? formatMatch[1] : "unknown";
            const originalLength = value.length;

            // Replace with placeholder
            return `[BASE64_IMAGE_PLACEHOLDER:${format}:${originalLength}_chars]`;
        }

        // Handle null or primitives
        if (value === null || typeof value !== "object") {
            return value;
        }

        // Avoid circular references and double processing
        if (processed.has(value)) {
            return value;
        }
        processed.add(value);

        // Handle arrays
        if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                value[i] = processValue(value[i]);
            }
            return value;
        }

        // Handle objects - recursively process all properties
        const objValue = value as Record<string, unknown>;
        for (const key in objValue) {
            if (Object.prototype.hasOwnProperty.call(objValue, key)) {
                objValue[key] = processValue(objValue[key]);
            }
        }

        return objValue;
    };

    return processValue(obj);
};

/**
 * Serialize a THREE.js object with optimizations for AI context
 * Automatically replaces base64 images with placeholders to reduce size
 * @param object THREE.js object to serialize
 * @param editor Editor instance with serializeObject method
 * @returns Serialized and optimized object data
 */
export const serializeObjectForAI = (object: THREE.Object3D, editor: unknown): unknown => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const serialized = (editor as any)?.serializeObject(object);

    if (!serialized) {
        return null;
    }

    // Replace base64 images with placeholders to reduce size
    return replaceBase64ImagesWithPlaceholders(serialized);
};

/**
 *
 * @param material
 */
function summarizeMaterial(material: THREE.Material): Record<string, unknown> {
    const summary: Record<string, unknown> = {
        type: material.type,
    };

    if ("color" in material && material.color instanceof THREE.Color) {
        summary.color = `#${material.color.getHexString()}`;
    }

    if ("opacity" in material && typeof material.opacity === "number" && material.opacity < 1) {
        summary.opacity = material.opacity;
    }

    if ("transparent" in material && material.transparent === true) {
        summary.transparent = true;
    }

    return summary;
}

/**
 * Build a compact object summary for prompt context. This keeps attached-object
 * context readable and token-efficient; the agent can inspect richer scene data
 * through its normal skill flow when needed.
 * @param object
 */
export const serializeObjectSummaryForPrompt = (object: THREE.Object3D): Record<string, unknown> => {
    const summary: Record<string, unknown> = {
        uuid: object.uuid,
        name: object.name || object.type,
        type: object.type,
        position: object.position.toArray(),
        rotation: object.rotation.toArray(),
        scale: object.scale.toArray(),
        visible: object.visible,
        childCount: object.children.length,
    };

    if (object.parent && object.parent.type !== "Scene") {
        summary.parent = {
            uuid: object.parent.uuid,
            name: object.parent.name || object.parent.type,
            type: object.parent.type,
        };
    }

    if (object instanceof THREE.Mesh) {
        summary.geometry = object.geometry?.type;

        if (Array.isArray(object.material)) {
            summary.materials = object.material.map(summarizeMaterial);
        } else if (object.material) {
            summary.material = summarizeMaterial(object.material);
        }
    }

    return summary;
};

/**
 * Serialize multiple THREE.js objects with optimizations
 * @param objects Array of THREE.js objects to serialize
 * @param editor Editor instance with serializeObject method
 * @returns Array of serialized and optimized object data
 */
export const serializeObjectsForAI = (objects: THREE.Object3D[], editor: unknown): unknown[] => {
    const serializedObjects: unknown[] = [];

    for (const obj of objects) {
        const serialized = serializeObjectForAI(obj, editor);
        if (serialized) {
            serializedObjects.push(serialized);
        }
    }

    return serializedObjects;
};

export const getObjectBaseMetaData = (object: THREE.Object3D): Record<string, unknown> => {
    return {
        uuid: object.uuid,
        name: object.name,
        type: object.type,
    };
};

export const getObjectMetaData = (object: THREE.Object3D): Record<string, unknown> => {
    return {
        ...getObjectBaseMetaData(object),
        position: object.position.toArray(),
        rotation: object.rotation.toArray(),
        scale: object.scale.toArray(),
    };
};
