import {renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {useApplySceneBehaviorRevision} from "./useApplySceneBehaviorRevision";

const hoisted = vi.hoisted(() => ({
    globalMock: {app: {editor: {isCollaborative: true}}},
    mockSaveScene: vi.fn(),
    mockUpdateSceneBehaviorRevision: vi.fn(),
}));

vi.mock("../../../global", () => ({
    default: hoisted.globalMock,
}));

vi.mock("@stem/network/api/scene", () => ({
    saveScene: (...args: unknown[]) => hoisted.mockSaveScene(...args),
}));

vi.mock("./behaviors", () => ({
    useUpdateSceneBehaviorRevision: () => hoisted.mockUpdateSceneBehaviorRevision,
}));

describe("useApplySceneBehaviorRevision", () => {
    beforeEach(() => {
        hoisted.globalMock.app.editor.isCollaborative = true;
        hoisted.mockSaveScene.mockReset();
        hoisted.mockUpdateSceneBehaviorRevision.mockReset();
        hoisted.mockSaveScene.mockResolvedValue(undefined);
    });

    it("persists the scene after a successful revision update", async () => {
        hoisted.mockUpdateSceneBehaviorRevision.mockResolvedValue(true);

        const {result} = renderHook(() => useApplySceneBehaviorRevision());

        await result.current("behavior.1", "rev-new", {
            code: "export default class BehaviorOne {}",
            config: {id: "behavior.1", name: "Behavior One"} as any,
        });

        expect(hoisted.mockUpdateSceneBehaviorRevision).toHaveBeenCalledWith("behavior.1", "rev-new", {
            code: "export default class BehaviorOne {}",
            config: {id: "behavior.1", name: "Behavior One"},
        });
        expect(hoisted.mockSaveScene).toHaveBeenCalledTimes(1);
        expect(hoisted.mockSaveScene).toHaveBeenCalledWith(false, false);
    });

    it("skips scene persistence when the revision update is a no-op", async () => {
        hoisted.mockUpdateSceneBehaviorRevision.mockResolvedValue(false);

        const {result} = renderHook(() => useApplySceneBehaviorRevision());

        await result.current("behavior.1", "rev-current");

        expect(hoisted.mockUpdateSceneBehaviorRevision).toHaveBeenCalledWith("behavior.1", "rev-current", {});
        expect(hoisted.mockSaveScene).not.toHaveBeenCalled();
    });

    it("skips scene persistence when collaborative mode is disabled", async () => {
        hoisted.globalMock.app.editor.isCollaborative = false;
        hoisted.mockUpdateSceneBehaviorRevision.mockResolvedValue(true);

        const {result} = renderHook(() => useApplySceneBehaviorRevision());

        await result.current("behavior.1", "rev-new");

        expect(hoisted.mockUpdateSceneBehaviorRevision).toHaveBeenCalledWith("behavior.1", "rev-new", {});
        expect(hoisted.mockSaveScene).not.toHaveBeenCalled();
    });
});
