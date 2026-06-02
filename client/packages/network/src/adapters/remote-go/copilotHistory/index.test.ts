import {beforeEach, describe, expect, it, vi} from "vitest";

const {ajax} = vi.hoisted(() => ({
    ajax: {
        get: vi.fn(),
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

import {
    addMessageExtra,
    createCopilotSession,
    deleteCopilotHistory,
    getCopilotHistoryList,
    getSessionExtras,
    updateCopilotHistoryCredits,
} from "./index";

describe("copilotHistory OSS adapter", () => {
    beforeEach(() => {
        ajax.get.mockReset();
        ajax.post.mockReset();
    });

    it("does not call server history endpoints in OSS mode", async () => {
        await expect(getCopilotHistoryList("scene-1")).resolves.toMatchObject({items: []});
        await expect(getSessionExtras("history-1")).resolves.toMatchObject({ID: "history-1", MessageExtras: []});
        await expect(createCopilotSession("session-1", "scene-1", "Title")).resolves.toBeUndefined();
        await expect(addMessageExtra("session-1", 0, ["object-1"])).resolves.toBeUndefined();
        await expect(updateCopilotHistoryCredits("session-1", 3)).resolves.toBeUndefined();
        await expect(deleteCopilotHistory("history-1")).resolves.toEqual({});

        expect(ajax.get).not.toHaveBeenCalled();
        expect(ajax.post).not.toHaveBeenCalled();
    });
});
