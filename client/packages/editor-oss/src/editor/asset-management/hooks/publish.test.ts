import {beforeEach, describe, expect, it, vi} from "vitest";

const {mockGlobal, mockPublishScene, mockUnpublishScene} = vi.hoisted(() => ({
    mockGlobal: {app: {call: vi.fn()}},
    mockPublishScene: vi.fn(),
    mockUnpublishScene: vi.fn(),
}));

vi.mock("../../../global", () => ({default: mockGlobal}));

vi.mock("@stem/network/api/scene/v2", () => ({
    publishScene: mockPublishScene,
    unpublishScene: mockUnpublishScene,
}));

import {emitScenePublishStateUpdated} from "./publish";

beforeEach(() => {
    vi.clearAllMocks();
    mockGlobal.app = {call: vi.fn()};
});

describe("emitScenePublishStateUpdated", () => {
    it("emits scenePublishStateUpdated with a structured payload", () => {
        emitScenePublishStateUpdated("scene-1", "asset-1", {
            publishRevisionId: "rev-7",
            isPublished: true,
            isPublic: true,
        } as any);

        expect(mockGlobal.app.call).toHaveBeenCalledWith(
            "scenePublishStateUpdated",
            null,
            {
                sceneId: "scene-1",
                assetId: "asset-1",
                publishRevisionId: "rev-7",
                isPublished: true,
                isPublic: true,
            },
        );
    });

    it("coerces nullish publishRevisionId / isPublished / isPublic to safe defaults", () => {
        emitScenePublishStateUpdated("scene-1", "asset-1", {
            publishRevisionId: undefined,
            isPublished: undefined,
            isPublic: undefined,
        } as any);

        expect(mockGlobal.app.call).toHaveBeenCalledWith(
            "scenePublishStateUpdated",
            null,
            {
                sceneId: "scene-1",
                assetId: "asset-1",
                publishRevisionId: "",
                isPublished: false,
                isPublic: false,
            },
        );
    });

    it("does not throw when global.app is null", () => {
        (mockGlobal as {app: unknown}).app = null;
        expect(() =>
            emitScenePublishStateUpdated("scene-1", "asset-1", {
                publishRevisionId: "rev-7",
                isPublished: true,
                isPublic: true,
            } as any),
        ).not.toThrow();
    });
});
