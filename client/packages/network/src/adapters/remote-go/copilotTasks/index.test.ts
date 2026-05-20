import type {AxiosResponse} from "axios";
import {beforeEach, describe, expect, it, vi} from "vitest";

import Ajax from "@web-shared/utils/Ajax";
import {
    createCopilotTask,
    deleteCopilotTask,
    listCopilotTasks,
    updateCopilotTask,
} from ".";

vi.mock("@web-shared/utils/Ajax", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock("@web-shared/utils/UrlUtils", () => ({
    backendUrlFromPath: (path: string) => `http://api.test${path}`,
}));

describe("copilotTasks API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("lists tasks with scene and session filters", async () => {
        vi.mocked(Ajax.get).mockResolvedValue({
            data: {Code: 200, Data: {items: [{ID: "task-1", Title: "Task"}]}},
        } as AxiosResponse);

        const tasks = await listCopilotTasks({sceneID: "scene-1", sessionID: "session-1", status: "todo", limit: 5});

        expect(tasks).toHaveLength(1);
        expect(Ajax.get).toHaveBeenCalledWith({
            url: "http://api.test/api/CopilotTasks/List?SceneID=scene-1&SessionID=session-1&Status=todo&limit=5",
        });
    });

    it("creates tasks as url encoded form payloads", async () => {
        vi.mocked(Ajax.post).mockResolvedValue({
            data: {Code: 200, Data: {ID: "task-1", Title: "Task"}},
        } as AxiosResponse);

        await createCopilotTask({sceneID: "scene-1", sessionID: "session-1", title: "Task", order: 2});

        expect(Ajax.post).toHaveBeenCalledWith({
            url: "http://api.test/api/CopilotTasks/Create",
            data: {
                SceneID: "scene-1",
                SessionID: "session-1",
                Title: "Task",
                Description: "",
                Status: "todo",
                Order: 2,
                Source: "copilot",
            },
            msgBodyType: "urlEncoded",
        });
    });

    it("updates tasks", async () => {
        vi.mocked(Ajax.post).mockResolvedValue({
            data: {Code: 200, Data: {ID: "task-1", Status: "done"}},
        } as AxiosResponse);

        await updateCopilotTask({id: "task-1", status: "done"});

        expect(Ajax.post).toHaveBeenCalledWith({
            url: "http://api.test/api/CopilotTasks/Update",
            data: {ID: "task-1", Status: "done"},
            msgBodyType: "urlEncoded",
        });
    });

    it("deletes tasks", async () => {
        vi.mocked(Ajax.post).mockResolvedValue({
            data: {Code: 200},
        } as AxiosResponse);

        await deleteCopilotTask("task-1");

        expect(Ajax.post).toHaveBeenCalledWith({
            url: "http://api.test/api/CopilotTasks/Delete",
            data: {ID: "task-1"},
            msgBodyType: "urlEncoded",
        });
    });
});
