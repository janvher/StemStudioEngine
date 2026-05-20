import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {PlayerTopNav} from "./PlayerTopNav";

const mocks = vi.hoisted(() => ({
    fetchRemixesOfScene: vi.fn(),
    forkScene: vi.fn(),
    openEditorRoute: vi.fn(),
    showToast: vi.fn(),
}));

vi.mock("@stem/network/api/scene", () => ({
    fetchRemixesOfScene: (...args: unknown[]) => mocks.fetchRemixesOfScene(...args),
}));

vi.mock("@stem/network/api/scene/v2", () => ({
    forkScene: (...args: unknown[]) => mocks.forkScene(...args),
}));

vi.mock("@stem/network/api/rewards", () => ({
    createTrackedShareUrl: vi.fn(),
}));

vi.mock("../../../showToast", () => ({
    showToast: (...args: unknown[]) => mocks.showToast(...args),
}));

vi.mock("../editorHandoff", () => ({
    openEditorRoute: (...args: unknown[]) => mocks.openEditorRoute(...args),
}));

vi.mock("../links", () => ({
    generateProjectLink: (sceneId?: string) => sceneId ? `/project/${sceneId}` : "/project",
    getGameUrl: (sceneId: string) => `/play/${sceneId}`,
}));

const createScene = (overrides: Record<string, unknown> = {}) => ({
    id: "scene-1",
    name: "Test Game",
    userId: "owner-1",
    isCloneable: false,
    ...overrides,
});

describe("PlayerTopNav remix action", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(document.head, {
            appendChild: vi.fn(),
            insertBefore: vi.fn(),
            removeChild: vi.fn(),
            querySelector: vi.fn(),
            querySelectorAll: vi.fn(() => []),
        });
        mocks.fetchRemixesOfScene.mockResolvedValue({Scenes: []});
        mocks.forkScene.mockResolvedValue({newSceneId: "forked-scene", newSceneName: "Forked Scene"});
    });

    it("shows Edit instead of Remix for the owner", () => {
        render(<PlayerTopNav scene={createScene() as any} viewerId="owner-1" />);

        expect(screen.queryByText("Remix")).toBeNull();
        const editAction = screen.getByText("Edit");

        fireEvent.click(editAction);

        expect(mocks.openEditorRoute).toHaveBeenCalledWith("/project/scene-1");
        expect(mocks.forkScene).not.toHaveBeenCalled();
    });

    it("hides Remix for non-remixable games", () => {
        render(<PlayerTopNav scene={createScene() as any} viewerId="viewer-1" />);

        expect(screen.queryByText("Remix")).not.toBeInTheDocument();

        expect(mocks.forkScene).not.toHaveBeenCalled();
    });

    it("remixes cloneable games for non-owners", async () => {
        render(<PlayerTopNav scene={createScene({isCloneable: true}) as any} viewerId="viewer-1" />);

        const remixAction = screen.getByText("Remix");
        expect(remixAction.getAttribute("aria-disabled")).toBe("false");

        fireEvent.click(remixAction);

        await waitFor(() => {
            expect(mocks.forkScene).toHaveBeenCalledWith("scene-1");
        });
        expect(mocks.openEditorRoute).toHaveBeenCalledWith("/project/forked-scene");
    });
});
