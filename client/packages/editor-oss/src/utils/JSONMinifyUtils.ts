export const expandKeys = <T>(obj: T, keyMap: Readonly<Record<string, string>>): T => {
    if (Array.isArray(obj)) {
        return obj.map(item => expandKeys(item, keyMap)) as T;
    }

    if (obj && typeof obj === "object") {
        const newObj: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            const fullKey = keyMap[key] || key;
            newObj[fullKey] = expandKeys(value, keyMap);
        }
        return newObj as T;
    }

    return obj;
};

export const minifyKeys = <T>(obj: T, keyMap: Readonly<Record<string, string>>): T => {
    if (Array.isArray(obj)) {
        return obj.map(
            item => minifyKeys(item, keyMap),
        ).filter(item => item !== undefined) as T;
    }

    if (obj && typeof obj === "object") {
        // Don't touch material-like objects to avoid color corruption
        if ("color" in obj || "emissive" in obj || "roughness" in obj) {
            return obj;
        }

        const newObj: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            // Skip null, undefined values
            if (value === null || value === undefined) {
                continue;
            }

            // Skip empty strings and objects - disabled for now because it
            // breaks some code that depends on them being present. In the
            // future, we should define a schema for our export format using
            // "zod" and use that to validate the data and fill-in optional
            // values. See src/asset-management/schema.ts for an example.
            //if ((typeof value === "string" && value.trim() === "") ||
            //    (typeof value === "object" && Object.keys(value as any).length === 0)) {
            //    continue;
            //}

            // Skip default values that don't affect scene
            if (
                key === "visible" && value === true ||
                key === "castShadow" && value === false ||
                key === "receiveShadow" && value === false
            ) {
                continue;
            }

            const shortKey = keyMap[key] || key;
            newObj[shortKey] = minifyKeys(value, keyMap);
        }

        return Object.keys(newObj).length > 0 ? (newObj as T) : (undefined as unknown as T);
    }

    return obj;
};
