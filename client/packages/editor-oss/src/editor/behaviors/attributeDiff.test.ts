import { describe, expect, it } from "vitest";

import { getModifiedAttributeKeys } from "./attributeDiff";

describe("behavior util", () => {
    describe("getModifiedAttributeKeys", () => {
        it("ignores top-level order-only changes", () => {
            const currentAttributes = {
                isDebug: {
                    type: "boolean",
                    default: false,
                    order: 1,
                },
            };
            const nextAttributes = {
                isDebug: {
                    type: "boolean",
                    default: false,
                    order: 0,
                },
            };

            const modified = getModifiedAttributeKeys(currentAttributes, nextAttributes);
            expect(modified).toEqual([]);
        });

        it("ignores nested group order-only changes", () => {
            const currentAttributes = {
                settings: {
                    type: "group",
                    order: 1,
                    attributes: {
                        first: { type: "string", default: "a", order: 0 },
                        second: { type: "string", default: "b", order: 1 },
                    },
                },
            };
            const nextAttributes = {
                settings: {
                    type: "group",
                    order: 0,
                    attributes: {
                        first: { type: "string", default: "a", order: 1 },
                        second: { type: "string", default: "b", order: 0 },
                    },
                },
            };

            const modified = getModifiedAttributeKeys(currentAttributes, nextAttributes);
            expect(modified).toEqual([]);
        });

        it("reports semantic changes", () => {
            const currentAttributes = {
                speed: {
                    type: "number",
                    default: 1,
                    min: 0,
                    max: 10,
                    order: 0,
                },
            };
            const nextAttributes = {
                speed: {
                    type: "number",
                    default: 1,
                    min: 0,
                    max: 20,
                    order: 1,
                },
            };

            const modified = getModifiedAttributeKeys(currentAttributes, nextAttributes);
            expect(modified).toEqual(["speed"]);
        });
    });
});
