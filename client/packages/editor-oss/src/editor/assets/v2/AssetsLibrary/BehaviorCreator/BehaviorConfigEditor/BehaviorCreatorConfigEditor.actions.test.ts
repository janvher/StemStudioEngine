/**
 * Tests for the per-row revision action filter inside the inline Behavior
 * Creator RevisionSection. Pins the matrix:
 *
 * | Row                          | Open in editor | Apply to scene |
 * |------------------------------|----------------|----------------|
 * | Current AND Scene (no diverge) | hidden         | hidden         |
 * | Current, ≠ Scene             | hidden         | shown          |
 * | Scene, ≠ Current             | shown          | hidden         |
 * | Other                        | shown          | shown          |
 *
 * The whole point of extracting `buildBehaviorCreatorRevisionActions` from
 * the JSX was to make this matrix testable without rendering React.
 */
import {describe, expect, it, vi} from "vitest";

import {buildBehaviorCreatorRevisionActions} from "./buildBehaviorCreatorRevisionActions";
import type {AssetRevision} from "@stem/network/api/asset";
import type {RevisionActionContext} from "../../RevisionSection/RevisionList";

const makeRevision = (id: string): AssetRevision =>
    ({
        id,
        createTime: "2026-04-09T00:00:00.000Z",
        userId: "u1",
    }) as AssetRevision;

const makeCtx = (
    revisionId: string,
    {isCurrent, isLatest = false, isOlderThanCurrent = false}: {isCurrent: boolean; isLatest?: boolean; isOlderThanCurrent?: boolean},
): RevisionActionContext => ({
    revision: makeRevision(revisionId),
    isCurrent,
    isLatest,
    isOlderThanCurrent,
});

const makeDeps = () => ({
    onOpenRevisionInEditor: vi.fn(),
    onApplyRevisionToScene: vi.fn(),
});

describe("buildBehaviorCreatorRevisionActions", () => {
    describe("when editor view and scene revision are the same (no divergence)", () => {
        const sceneRevisionId = "rev-shared";

        it("hides both Open and Apply on the shared current+scene row", () => {
            const actions = buildBehaviorCreatorRevisionActions(
                makeCtx("rev-shared", {isCurrent: true}),
                {sceneRevisionId, ...makeDeps()},
            );
            expect(actions).toEqual([]);
        });

        it("shows both Open and Apply on any other row", () => {
            const actions = buildBehaviorCreatorRevisionActions(
                makeCtx("rev-other", {isCurrent: false}),
                {sceneRevisionId, ...makeDeps()},
            );
            expect(actions.map(a => a.key)).toEqual(["open", "apply"]);
        });
    });

    describe("when editor view and scene revision are diverged", () => {
        const sceneRevisionId = "rev-scene";

        it("on the editor's current row (≠ scene): shows only Apply", () => {
            const actions = buildBehaviorCreatorRevisionActions(
                makeCtx("rev-editor-view", {isCurrent: true}),
                {sceneRevisionId, ...makeDeps()},
            );
            expect(actions.map(a => a.key)).toEqual(["apply"]);
        });

        it("on the scene's row (≠ current): shows only Open", () => {
            const actions = buildBehaviorCreatorRevisionActions(
                makeCtx("rev-scene", {isCurrent: false}),
                {sceneRevisionId, ...makeDeps()},
            );
            expect(actions.map(a => a.key)).toEqual(["open"]);
        });

        it("on a third unrelated row: shows both Open and Apply", () => {
            const actions = buildBehaviorCreatorRevisionActions(
                makeCtx("rev-third", {isCurrent: false}),
                {sceneRevisionId, ...makeDeps()},
            );
            expect(actions.map(a => a.key)).toEqual(["open", "apply"]);
        });
    });

    describe("action callbacks fire with the row's revision id", () => {
        it("Apply forwards the row's revision id, not the editor's or scene's", () => {
            const deps = makeDeps();
            const actions = buildBehaviorCreatorRevisionActions(
                makeCtx("rev-third", {isCurrent: false}),
                {sceneRevisionId: "rev-scene", ...deps},
            );
            const apply = actions.find(a => a.key === "apply")!;
            apply.onClick({} as React.MouseEvent);
            expect(deps.onApplyRevisionToScene).toHaveBeenCalledWith({}, "rev-third");
        });

        it("Open forwards the row's revision id", () => {
            const deps = makeDeps();
            const actions = buildBehaviorCreatorRevisionActions(
                makeCtx("rev-third", {isCurrent: false}),
                {sceneRevisionId: "rev-scene", ...deps},
            );
            const open = actions.find(a => a.key === "open")!;
            open.onClick({} as React.MouseEvent);
            expect(deps.onOpenRevisionInEditor).toHaveBeenCalledWith("rev-third");
        });
    });

    describe("when callbacks are not provided", () => {
        it("omits Open when onOpenRevisionInEditor is undefined", () => {
            const actions = buildBehaviorCreatorRevisionActions(
                makeCtx("rev-other", {isCurrent: false}),
                {sceneRevisionId: "rev-scene", onApplyRevisionToScene: vi.fn()},
            );
            expect(actions.map(a => a.key)).toEqual(["apply"]);
        });

        it("omits Apply when onApplyRevisionToScene is undefined", () => {
            const actions = buildBehaviorCreatorRevisionActions(
                makeCtx("rev-other", {isCurrent: false}),
                {sceneRevisionId: "rev-scene", onOpenRevisionInEditor: vi.fn()},
            );
            expect(actions.map(a => a.key)).toEqual(["open"]);
        });
    });
});
