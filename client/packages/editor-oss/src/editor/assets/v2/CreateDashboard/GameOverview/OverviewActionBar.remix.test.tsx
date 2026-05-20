import {render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {OverviewActionBar} from "./OverviewActionBar";
import type {FileData} from "../../types/file";

const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    forkScene: vi.fn(),
    updateScene: vi.fn(),
    getScene: vi.fn(),
    saveTemplateIds: vi.fn(),
    publishScene: vi.fn(),
    unpublishScene: vi.fn(),
    addLikedGame: vi.fn(),
    createTrackedShareUrl: vi.fn(),
    showToast: vi.fn(),
    trackProductEvent: vi.fn(),
    openEditorRoute: vi.fn(),
    redirectToLogin: vi.fn(),
    ajaxPost: vi.fn(),
    auth: {
        isAdmin: false,
        isAuthorized: true,
        setDbUser: vi.fn(),
        handleGetLikedGames: vi.fn(),
    },
}));

vi.mock("react-router-dom", () => ({
    useNavigate: () => mocks.navigate,
}));

vi.mock("@stem/network/api/rewards", () => ({
    createTrackedShareUrl: (...args: unknown[]) => mocks.createTrackedShareUrl(...args),
}));

vi.mock("@stem/network/api/scene/v2", () => ({
    forkScene: (...args: unknown[]) => mocks.forkScene(...args),
    getScene: (...args: unknown[]) => mocks.getScene(...args),
    updateScene: (...args: unknown[]) => mocks.updateScene(...args),
}));

vi.mock("@stem/network/api/templates/hooks", () => ({
    useTemplateIds: () => ({data: [], isLoading: false}),
    useSetTemplateIds: () => ({mutateAsync: mocks.saveTemplateIds, isPending: false}),
}));

vi.mock("@stem/network/api/updateUser", () => ({
    addLikedGame: (...args: unknown[]) => mocks.addLikedGame(...args),
}));

vi.mock("../../../../../context", () => ({
    useAppGlobalContext: () => ({openSceneHistoryModal: vi.fn()}),
    useAuthorizationContext: () => mocks.auth,
    useHomepageContext: () => ({setShouldRefreshDashboard: vi.fn()}),
}));

vi.mock("../../../../../global", () => ({
    default: {
        app: {
            on: vi.fn(),
        },
    },
}));

vi.mock("../../../../../showToast", () => ({
    showToast: (...args: unknown[]) => mocks.showToast(...args),
}));

vi.mock("../../../../../utils/Ajax", () => ({
    default: {
        post: (...args: unknown[]) => mocks.ajaxPost(...args),
    },
}));

vi.mock("../../../../../utils/authRedirect", () => ({
    redirectToLogin: (...args: unknown[]) => mocks.redirectToLogin(...args),
}));

vi.mock("../../../../../utils/productAnalytics", () => ({
    PRODUCT_ANALYTICS_EVENTS: {
        GAME_REMIX_CLICKED: "game_remix_clicked",
        GAME_PLAY_CLICKED: "game_play_clicked",
        GAME_LIKE_CLICKED: "game_like_clicked",
        GAME_SHARE_CLICKED: "game_share_clicked",
    },
    trackProductEvent: (...args: unknown[]) => mocks.trackProductEvent(...args),
}));

vi.mock("../../../../../utils/UrlUtils", () => ({
    backendUrlFromPath: (path: string) => path,
}));

vi.mock("../../../../../v2/pages/editorHandoff", () => ({
    openEditorRoute: (...args: unknown[]) => mocks.openEditorRoute(...args),
}));

vi.mock("../../../../../v2/pages/links", () => ({
    generateProjectLink: (sceneId?: string) => sceneId ? `/project/${sceneId}` : "/project",
    getGameUrl: (sceneId: string) => `/play/${sceneId}`,
}));

vi.mock("../../../../asset-management/hooks/publish", () => ({
    usePublishScene: () => ({mutateAsync: mocks.publishScene}),
    useUnpublishScene: () => ({mutateAsync: mocks.unpublishScene}),
}));

const createScene = (overrides: Partial<FileData> = {}): FileData => ({
    ID: "scene-1",
    publishRevisionId: "",
    AssetID: "asset-1",
    UserID: "owner-1",
    Name: "Test Game",
    Description: "",
    PlayCount: 0,
    RemixCount: 0,
    Tags: "",
    Thumbnail: "",
    Url: "",
    UpdateTime: "2026-05-08T00:00:00Z",
    IsSandbox: false,
    IsPublished: true,
    IsPublic: true,
    IsCloneable: false,
    ...overrides,
});

describe("OverviewActionBar remix visibility", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.isAdmin = false;
        mocks.auth.isAuthorized = true;
        Object.assign(document.head, {
            appendChild: vi.fn(),
            insertBefore: vi.fn(),
            removeChild: vi.fn(),
            querySelector: vi.fn(),
            querySelectorAll: vi.fn(() => []),
        });
        globalThis.IntersectionObserver = vi.fn(function MockIntersectionObserver() {
            return {
                disconnect: vi.fn(),
                observe: vi.fn(),
                unobserve: vi.fn(),
                takeRecords: vi.fn(() => []),
            };
        }) as unknown as typeof IntersectionObserver;
    });

    it("disables remix for non-owner editors when the scene is not cloneable", () => {
        mocks.auth.isAdmin = true;

        render(
            <OverviewActionBar
                scene={createScene()}
                canEdit
                isOwner={false}
                onSceneUpdate={vi.fn()}
            />,
        );

        const remixButton = screen.getByTestId("overview-remix") as HTMLButtonElement;
        expect(remixButton.disabled).toBe(true);
    });

    it("shows remix for non-owners only when the scene is explicitly cloneable", () => {
        render(
            <OverviewActionBar
                scene={createScene({IsCloneable: true})}
                canEdit={false}
                isOwner={false}
                onSceneUpdate={vi.fn()}
            />,
        );

        const remixButton = screen.getByTestId("overview-remix") as HTMLButtonElement;
        expect(remixButton.disabled).toBe(false);
    });
});
