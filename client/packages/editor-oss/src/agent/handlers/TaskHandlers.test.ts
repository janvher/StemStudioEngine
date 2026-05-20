import {beforeEach, describe, expect, it, vi} from "vitest";

import {TaskHandlers} from "./TaskHandlers";
import {
    createCopilotTask,
    deleteCopilotTask,
    listCopilotTasks,
    updateCopilotTask,
} from "@stem/network/api/copilotTasks";

vi.mock("@stem/network/api/copilotTasks", () => ({
    listCopilotTasks: vi.fn(),
    createCopilotTask: vi.fn(),
    updateCopilotTask: vi.fn(),
    deleteCopilotTask: vi.fn(),
}));

describe("TaskHandlers", () => {
    const engine = {
        editor: {
            sceneID: "scene-1",
        },
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("lists project tasks using active scene and session", async () => {
        vi.mocked(listCopilotTasks).mockResolvedValue([
            {
                ID: "task-1",
                SceneID: "scene-1",
                SessionID: "session-1",
                UserID: "user-1",
                Title: "Build arena",
                Status: "todo",
                Order: 0,
                Source: "copilot",
                CreatedBy: "user-1",
                AddTime: "",
                UpdateTime: "",
            },
        ]);
        const handlers = new TaskHandlers(engine, {getSessionId: () => "session-1"});

        const result = await handlers.handleListProjectTasks({});

        expect(result.status).toBe("success");
        expect(listCopilotTasks).toHaveBeenCalledWith({
            sceneID: "scene-1",
            sessionID: "session-1",
            status: undefined,
            limit: 100,
        });
    });

    it("creates project tasks with normalized defaults", async () => {
        vi.mocked(createCopilotTask).mockResolvedValue({
            ID: "task-1",
            SceneID: "scene-1",
            SessionID: "session-1",
            UserID: "user-1",
            Title: "Add player",
            Status: "todo",
            Order: 1,
            Source: "copilot",
            CreatedBy: "user-1",
            AddTime: "",
            UpdateTime: "",
        });
        const handlers = new TaskHandlers(engine, {getSessionId: () => "session-1"});

        const result = await handlers.handleCreateProjectTask({title: "Add player", order: "1"});

        expect(result.status).toBe("success");
        expect(createCopilotTask).toHaveBeenCalledWith({
            sceneID: "scene-1",
            sessionID: "session-1",
            title: "Add player",
            description: undefined,
            status: "todo",
            order: 1,
            source: "copilot",
        });
    });

    it("updates a project task status", async () => {
        vi.mocked(updateCopilotTask).mockResolvedValue({
            ID: "task-1",
            SceneID: "scene-1",
            UserID: "user-1",
            Title: "Add player",
            Status: "done",
            Order: 1,
            Source: "copilot",
            CreatedBy: "user-1",
            AddTime: "",
            UpdateTime: "",
        });
        const handlers = new TaskHandlers(engine);

        const result = await handlers.handleUpdateProjectTask({id: "task-1", status: "done"});

        expect(result.status).toBe("success");
        expect(updateCopilotTask).toHaveBeenCalledWith({
            id: "task-1",
            title: undefined,
            description: undefined,
            status: "done",
            order: undefined,
        });
    });

    it("deletes a project task", async () => {
        vi.mocked(deleteCopilotTask).mockResolvedValue(undefined);
        const handlers = new TaskHandlers(engine);

        const result = await handlers.handleDeleteProjectTask({id: "task-1"});

        expect(result.status).toBe("success");
        expect(deleteCopilotTask).toHaveBeenCalledWith("task-1");
    });
});
