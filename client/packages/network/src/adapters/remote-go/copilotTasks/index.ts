import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";
import {IS_OSS} from "../../../buildMode";

export type CopilotTaskStatus = "todo" | "in_progress" | "done" | "blocked" | "cancelled";

export type CopilotTask = {
    ID: string;
    SceneID: string;
    SessionID?: string;
    UserID: string;
    Title: string;
    Description?: string;
    Status: CopilotTaskStatus;
    Order: number;
    Source: string;
    CreatedBy: string;
    AddTime: string;
    UpdateTime: string;
    CompletedTime?: string;
};

export type CopilotTaskInput = {
    sceneID: string;
    sessionID?: string;
    title: string;
    description?: string;
    status?: CopilotTaskStatus;
    order?: number;
    source?: string;
};

export type CopilotTaskUpdateInput = {
    id: string;
    title?: string;
    description?: string;
    status?: CopilotTaskStatus;
    order?: number;
};

function assertSuccess(
    response: {data?: {Code?: number; Msg?: string; Data?: unknown}} | undefined,
    fallback: string,
): any {
    if (response?.data?.Code !== 200) {
        throw new Error(response?.data?.Msg || fallback);
    }
    return response.data.Data;
}

export async function listCopilotTasks(input: {
    sceneID: string;
    sessionID?: string;
    status?: CopilotTaskStatus;
    limit?: number;
}): Promise<CopilotTask[]> {
    // OSS ships only the AI proxy — there is no Copilot task service to
    // persist to. Return an empty list instead of 404-ing on every load.
    if (IS_OSS) return [];

    const params = new URLSearchParams();
    params.append("SceneID", input.sceneID);
    if (input.sessionID) params.append("SessionID", input.sessionID);
    if (input.status) params.append("Status", input.status);
    if (input.limit) params.append("limit", input.limit.toString());

    const response = await Ajax.get({
        url: backendUrlFromPath(`/api/CopilotTasks/List?${params.toString()}`),
    });
    const data = assertSuccess(response, "Failed to list project tasks.");
    return data?.items || [];
}

export async function createCopilotTask(input: CopilotTaskInput): Promise<CopilotTask> {
    const response = await Ajax.post({
        url: backendUrlFromPath("/api/CopilotTasks/Create"),
        data: {
            SceneID: input.sceneID,
            SessionID: input.sessionID || "",
            Title: input.title,
            Description: input.description || "",
            Status: input.status || "todo",
            Order: input.order ?? 0,
            Source: input.source || "copilot",
        },
        msgBodyType: "urlEncoded",
    });
    return assertSuccess(response, "Failed to create project task.");
}

export async function updateCopilotTask(input: CopilotTaskUpdateInput): Promise<CopilotTask> {
    const data: Record<string, string | number> = {
        ID: input.id,
    };
    if (input.title !== undefined) data.Title = input.title;
    if (input.description !== undefined) data.Description = input.description;
    if (input.status !== undefined) data.Status = input.status;
    if (input.order !== undefined) data.Order = input.order;

    const response = await Ajax.post({
        url: backendUrlFromPath("/api/CopilotTasks/Update"),
        data,
        msgBodyType: "urlEncoded",
    });
    return assertSuccess(response, "Failed to update project task.");
}

export async function deleteCopilotTask(id: string): Promise<void> {
    const response = await Ajax.post({
        url: backendUrlFromPath("/api/CopilotTasks/Delete"),
        data: {ID: id},
        msgBodyType: "urlEncoded",
    });
    assertSuccess(response, "Failed to delete project task.");
}
