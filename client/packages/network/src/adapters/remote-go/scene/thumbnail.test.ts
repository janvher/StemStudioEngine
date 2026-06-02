import {beforeEach, describe, expect, it, vi} from "vitest";

const {ajax} = vi.hoisted(() => ({
    ajax: {
        post: vi.fn(),
    },
}));

vi.mock("../../../buildMode", () => ({
    IS_OSS: true,
}));

vi.mock("@web-shared/utils/Ajax", () => ({
    default: ajax,
}));

vi.mock("@web-shared/utils/UrlUtils", () => ({
    backendUrlFromPath: (path: string) => path,
}));

import {setSceneAiPromptMode} from "./thumbnail";

describe("scene thumbnail API OSS guards", () => {
    beforeEach(() => {
        ajax.post.mockReset();
    });

    it("does not call /api/Scene/Edit when toggling AI prompt mode in OSS", async () => {
        await expect(setSceneAiPromptMode("scene-1", "Scene 1", true)).resolves.toBeUndefined();

        expect(ajax.post).not.toHaveBeenCalled();
    });
});
