import { isEqual } from "lodash";

const stripAttributeOrderMetadata = (value: unknown): unknown => {
    if (Array.isArray(value)) {
        return value.map(item => stripAttributeOrderMetadata(item));
    }

    if (value && typeof value === "object") {
        const objectValue = value as Record<string, unknown>;
        const cleanedEntries = Object.entries(objectValue)
            .filter(([key]) => key !== "order")
            .map(([key, nestedValue]) => [key, stripAttributeOrderMetadata(nestedValue)]);

        return Object.fromEntries(cleanedEntries);
    }

    return value;
};

export const getModifiedAttributeKeys = (
    currentAttributes: Record<string, any>,
    nextAttributes: Record<string, any>,
) => {
    return Object.keys(nextAttributes || {}).filter(key => {
        const current = stripAttributeOrderMetadata(currentAttributes?.[key]);
        const next = stripAttributeOrderMetadata(nextAttributes?.[key]);
        return !isEqual(current, next);
    });
};
