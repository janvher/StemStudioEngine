import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {SceneListItem} from "./SceneListItem";

const mocks = vi.hoisted(() => ({
    forkScene: vi.fn(),
    openEditorRoute: vi.fn(),
    showToast: vi.fn(),
    trackProductEvent: vi.fn(),
    redirectToLogin: vi.fn(),
    navigate: vi.fn(),
    auth: {
        dbUser: {id: "owner-1", username: "Owner"},
        isAuthorized: true,
    },
}));

vi.mock("react-router", () => ({
    useLocation: () => ({pathname: "/discover"}),
    useNavigate: () => mocks.navigate,
}));

vi.mock("@stem/network/api/scene/v2", () => ({
    forkScene: (...args: unknown[]) => mocks.forkScene(...args),
}));

vi.mock("../../../../../context", () => ({
    useAuthorizationContext: () => mocks.auth,
}));

vi.mock("../../../../../services", () => ({
    getThumbnail: () => undefined,
}));

vi.mock("../../../../../showToast", () => ({
    showToast: (...args: unknown[]) => mocks.showToast(...args),
}));

vi.mock("../../../../../v2/pages/editorHandoff", () => ({
    openEditorRoute: (...args: unknown[]) => mocks.openEditorRoute(...args),
}));

vi.mock("../../../../../v2/pages/links", () => ({
    generateProjectLink: (sceneId?: string) => sceneId ? `/project/${sceneId}` : "/project",
    getGameUrl: (sceneId: string) => `/play/${sceneId}`,
}));

vi.mock("../../../../../utils/authRedirect", () => ({
    redirectToLogin: (...args: unknown[]) => mocks.redirectToLogin(...args),
}));

vi.mock("../../../../../utils/productAnalytics", () => ({
    PRODUCT_ANALYTICS_EVENTS: {
        GAME_REMIX_CLICKED: "game_remix_clicked",
        GAME_CARD_OPENED: "game_card_opened",
        CREATE_BLANK_STARTED: "create_blank_started",
        GAME_PLAY_CLICKED: "game_play_clicked",
    },
    trackProductEvent: (...args: unknown[]) => mocks.trackProductEvent(...args),
}));

vi.mock("../../common/ProgressiveImage/ProgressiveImage", () => ({
    ProgressiveImage: ({src, alt}: {src: string; alt: string}) => <img src={src} alt={alt} />,
}));

const baseItem = {
    ID: "scene-1",
    Name: "Merge Test Game",
    UserID: "owner-1",
    Username: "Owner",
    Thumbnail: "",
    Description: "",
    IsCloneable: true,
    IsPublished: true,
    IsPublic: true,
    Likes: 0,
    RemixCount: 0,
    PlayCount: 0,
    ShareCount: 0,
    UpdateTime: "2026-05-04T00:00:00Z",
};

describe("SceneListItem remix routing", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(document.head, {
            appendChild: vi.fn(),
            insertBefore: vi.fn(),
            removeChild: vi.fn(),
            querySelector: vi.fn(),
            querySelectorAll: vi.fn(() => []),
        });
        mocks.forkScene.mockResolvedValue({newSceneId: "forked-scene", newSceneName: "Forked Scene"});
        mocks.auth.dbUser = {id: "owner-1", username: "Owner"};
        mocks.auth.isAuthorized = true;
    });

    it.each([
        ["owned", {dbUserId: "owner-1"}],
        ["non-owned", {dbUserId: "viewer-1"}],
    ])("uses forkScene for %s remix actions", async (_label, {dbUserId}) => {
        mocks.auth.dbUser = {id: dbUserId, username: "Viewer"};

        render(
            <SceneListItem
                item={baseItem as any}
                routeKind="discover"
            />,
        );

        fireEvent.click(screen.getByTestId("game-card-remix"));

        await waitFor(() => {
            expect(mocks.forkScene).toHaveBeenCalledWith("scene-1");
        });
        expect(mocks.openEditorRoute).toHaveBeenCalledWith("/project/forked-scene");
        expect(mocks.showToast).toHaveBeenCalledWith({type: "success", title: "Starting a remix"});
    });

    it.each([
        ["false", {...baseItem, UserID: "owner-1", IsCloneable: false}],
        ["missing", (() => {
            const {IsCloneable: _omitted, ...itemWithoutCloneable} = baseItem;
            return {...itemWithoutCloneable, UserID: "owner-1"};
        })()],
    ])("disables remix for non-owned games when IsCloneable is %s", (_label, item) => {
        mocks.auth.dbUser = {id: "viewer-1", username: "Viewer"};

        render(
            <SceneListItem
                item={item as any}
                routeKind="discover"
            />,
        );

        const remixButton = screen.getByTestId("game-card-remix") as HTMLButtonElement;
        expect(remixButton.disabled).toBe(true);
        fireEvent.click(remixButton);
        expect(mocks.forkScene).not.toHaveBeenCalled();
    });

    it("keeps owner duplicate/remix available when IsCloneable is false", async () => {
        mocks.auth.dbUser = {id: "owner-1", username: "Owner"};

        render(
            <SceneListItem
                item={{...baseItem, IsCloneable: false} as any}
                routeKind="discover"
            />,
        );

        fireEvent.click(screen.getByTestId("game-card-remix"));

        await waitFor(() => {
            expect(mocks.forkScene).toHaveBeenCalledWith("scene-1");
        });
    });
});
