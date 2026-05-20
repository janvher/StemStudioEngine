import EngineRuntime from "../../EngineRuntime";
import {
    createCopilotTask,
    deleteCopilotTask,
    listCopilotTasks,
    updateCopilotTask,
} from "@stem/network/api/copilotTasks";
import type {CopilotTaskStatus} from "@stem/network/api/copilotTasks";
import {CommandResult} from "../types/ACPTypes";

export type TaskHandlersOptions = {
    getSessionId?: () => string | null | undefined;
};

const TASK_STATUSES: CopilotTaskStatus[] = ["todo", "in_progress", "done", "blocked", "cancelled"];

function isCopilotTaskStatus(value: string): value is CopilotTaskStatus {
    return TASK_STATUSES.includes(value as CopilotTaskStatus);
}

function optionalString(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
}

function optionalNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

function normalizeStatus(value: unknown): CopilotTaskStatus | undefined {
    const status = optionalString(value);
    if (!status) return undefined;
    return isCopilotTaskStatus(status) ? status : undefined;
}

export class TaskHandlers {
    constructor(
        private readonly engine: EngineRuntime,
        private readonly options: TaskHandlersOptions = {},
    ) {}

    private getSceneID(params: Record<string, unknown>): string | undefined {
        const editor = this.engine.editor as unknown as {sceneID?: unknown} | undefined;
        return optionalString(params.sceneID)
            || optionalString(params.sceneId)
            || optionalString(params.SceneID)
            || optionalString(editor?.sceneID);
    }

    private getSessionID(params: Record<string, unknown>): string | undefined {
        return optionalString(params.sessionID)
            || optionalString(params.sessionId)
            || optionalString(params.SessionID)
            || optionalString(this.options.getSessionId?.());
    }

    async handleListProjectTasks(params: Record<string, unknown>): Promise<CommandResult> {
        const sceneID = this.getSceneID(params);
        if (!sceneID) {
            return {status: "failed", message: "No active scene/project is available for project tasks."};
        }

        const tasks = await listCopilotTasks({
            sceneID,
            sessionID: this.getSessionID(params),
            status: normalizeStatus(params.status ?? params.Status),
            limit: optionalNumber(params.limit) ?? 100,
        });
        return {
            status: "success",
            message: `Loaded ${tasks.length} project task${tasks.length === 1 ? "" : "s"}.`,
            data: {tasks},
        };
    }

    async handleCreateProjectTask(params: Record<string, unknown>): Promise<CommandResult> {
        const sceneID = this.getSceneID(params);
        const title = optionalString(params.title ?? params.Title);
        if (!sceneID) {
            return {status: "failed", message: "No active scene/project is available for project tasks."};
        }
        if (!title) {
            return {status: "failed", message: "Task title is required."};
        }

        const task = await createCopilotTask({
            sceneID,
            sessionID: this.getSessionID(params),
            title,
            description: optionalString(params.description ?? params.Description),
            status: normalizeStatus(params.status ?? params.Status) || "todo",
            order: optionalNumber(params.order ?? params.Order),
            source: optionalString(params.source ?? params.Source) || "copilot",
        });
        return {
            status: "success",
            message: `Created project task: ${task.Title}`,
            data: {task},
        };
    }

    async handleUpdateProjectTask(params: Record<string, unknown>): Promise<CommandResult> {
        const id = optionalString(params.id ?? params.ID);
        if (!id) {
            return {status: "failed", message: "Task ID is required."};
        }

        const task = await updateCopilotTask({
            id,
            title: optionalString(params.title ?? params.Title),
            description: typeof (params.description ?? params.Description) === "string"
                ? (params.description ?? params.Description) as string
                : undefined,
            status: normalizeStatus(params.status ?? params.Status),
            order: optionalNumber(params.order ?? params.Order),
        });
        return {
            status: "success",
            message: `Updated project task: ${task.Title}`,
            data: {task},
        };
    }

    async handleDeleteProjectTask(params: Record<string, unknown>): Promise<CommandResult> {
        const id = optionalString(params.id ?? params.ID);
        if (!id) {
            return {status: "failed", message: "Task ID is required."};
        }

        await deleteCopilotTask(id);
        return {
            status: "success",
            message: `Deleted project task ${id}.`,
        };
    }
}
