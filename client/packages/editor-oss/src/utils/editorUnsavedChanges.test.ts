import { describe, expect, it } from "vitest";

import { editorHasUnsavedChanges } from "./editorUnsavedChanges";

describe("editorHasUnsavedChanges", () => {
    it("returns true when the scene has edits after the last save", () => {
        expect(
            editorHasUnsavedChanges({
                lastEditTime: "2026-03-15T12:05:00.000Z",
                lastSaveTime: "2026-03-15T12:00:00.000Z",
            }),
        ).toBe(true);
    });

    it("returns false when the scene is already saved", () => {
        expect(
            editorHasUnsavedChanges({
                lastEditTime: "2026-03-15T12:00:00.000Z",
                lastSaveTime: "2026-03-15T12:05:00.000Z",
            }),
        ).toBe(false);
    });

    it("returns false before any edit has been recorded", () => {
        expect(
            editorHasUnsavedChanges({
                lastSaveTime: "2026-03-15T12:05:00.000Z",
            }),
        ).toBe(false);

        expect(editorHasUnsavedChanges()).toBe(false);
    });

    it("returns true when an edit exists but no save has been recorded", () => {
        expect(
            editorHasUnsavedChanges({
                lastEditTime: "2026-03-15T12:05:00.000Z",
            }),
        ).toBe(true);
    });
});
