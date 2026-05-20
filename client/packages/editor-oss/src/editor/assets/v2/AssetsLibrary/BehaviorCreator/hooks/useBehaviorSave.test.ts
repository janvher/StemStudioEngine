import {describe, it, expect} from "vitest";

import {findInvalidAttributePath} from "./useBehaviorSave";

describe("findInvalidAttributePath", () => {
    it("returns null for null/undefined/empty input", () => {
        expect(findInvalidAttributePath(null)).toBeNull();
        expect(findInvalidAttributePath(undefined)).toBeNull();
        expect(findInvalidAttributePath({})).toBeNull();
    });

    it("returns null when all top-level attributes have a name", () => {
        expect(
            findInvalidAttributePath({
                yOffset: {name: "Y Offset", type: "number"},
                zOffset: {name: "Z Offset", type: "number"},
            }),
        ).toBeNull();
    });

    it("flags an attribute with a missing name", () => {
        expect(
            findInvalidAttributePath({
                yOffset: {name: "Y Offset", type: "number"},
                zOffset: {type: "number"},
            }),
        ).toBe("zOffset");
    });

    it("flags an attribute stored under an empty-string key (returns empty path, not null)", () => {
        const result = findInvalidAttributePath({
            "": {name: "", type: "string"},
        });
        expect(result).not.toBeNull();
        expect(result).toBe("");
    });

    it("flags an attribute with an empty-string name", () => {
        expect(
            findInvalidAttributePath({
                bad: {name: "", type: "number"},
            }),
        ).toBe("bad");
    });

    it("flags a null attribute value", () => {
        expect(findInvalidAttributePath({bad: null})).toBe("bad");
    });

    it("recurses into group attributes and returns the dotted path", () => {
        expect(
            findInvalidAttributePath({
                ui: {
                    name: "UI",
                    type: "group",
                    attributes: {
                        title: {name: "Title", type: "string"},
                        broken: {type: "number"},
                    },
                },
            }),
        ).toBe("ui.broken");
    });

    it("recurses through array group attributes", () => {
        expect(
            findInvalidAttributePath({
                items: {
                    name: "Items",
                    type: "group",
                    array: true,
                    attributes: {
                        label: {name: "Label", type: "string"},
                        value: {name: "", type: "number"},
                    },
                },
            }),
        ).toBe("items.value");
    });

    it("supports deeply nested groups", () => {
        expect(
            findInvalidAttributePath({
                a: {
                    name: "A",
                    type: "group",
                    attributes: {
                        b: {
                            name: "B",
                            type: "group",
                            attributes: {
                                c: {type: "number"},
                            },
                        },
                    },
                },
            }),
        ).toBe("a.b.c");
    });

    it("returns null for valid nested groups", () => {
        expect(
            findInvalidAttributePath({
                ui: {
                    name: "UI",
                    type: "group",
                    attributes: {
                        title: {name: "Title", type: "string"},
                        nested: {
                            name: "Nested",
                            type: "group",
                            attributes: {
                                ok: {name: "OK", type: "number"},
                            },
                        },
                    },
                },
            }),
        ).toBeNull();
    });
});
