export const DASHBOARD_COPILOT_BOOTSTRAP_KEY = "dashboard_copilot_bootstrap";

export type DashboardCopilotEntryMode =
    | "create_from_prompt"
    | "remix_existing_game"
    | "edit_current_game";

export type DashboardCopilotBootstrap = {
    prompt?: string;
    autoSubmit?: boolean;
    placeholderThumbnail?: string;
    entryMode?: DashboardCopilotEntryMode;
    sourceSceneId?: string;
    sourceSceneName?: string;
    sourceCreatorName?: string;
};

const isDashboardCopilotEntryMode = (value: unknown): value is DashboardCopilotEntryMode =>
    value === "create_from_prompt" ||
    value === "remix_existing_game" ||
    value === "edit_current_game";

const normalizeOptionalString = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
};

export const readDashboardCopilotBootstrap = (): DashboardCopilotBootstrap | null => {
    try {
        const raw = sessionStorage.getItem(DASHBOARD_COPILOT_BOOTSTRAP_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as DashboardCopilotBootstrap;
        const prompt = normalizeOptionalString(parsed?.prompt);
        const entryMode = isDashboardCopilotEntryMode(parsed?.entryMode) ? parsed.entryMode : undefined;
        if (!prompt && !entryMode) return null;

        return {
            prompt,
            autoSubmit: parsed.autoSubmit ?? Boolean(prompt),
            placeholderThumbnail: parsed.placeholderThumbnail,
            entryMode,
            sourceSceneId: normalizeOptionalString(parsed.sourceSceneId),
            sourceSceneName: normalizeOptionalString(parsed.sourceSceneName),
            sourceCreatorName: normalizeOptionalString(parsed.sourceCreatorName),
        };
    } catch (error) {
        console.warn("[dashboardCopilotBootstrap] Failed to read bootstrap payload:", error);
        return null;
    }
};

export const writeDashboardCopilotBootstrap = (payload: DashboardCopilotBootstrap) => {
    try {
        const prompt = payload.prompt?.trim() || undefined;
        sessionStorage.setItem(
            DASHBOARD_COPILOT_BOOTSTRAP_KEY,
            JSON.stringify({
                prompt,
                autoSubmit: payload.autoSubmit ?? Boolean(prompt),
                placeholderThumbnail: payload.placeholderThumbnail,
                entryMode: payload.entryMode,
                sourceSceneId: payload.sourceSceneId,
                sourceSceneName: payload.sourceSceneName,
                sourceCreatorName: payload.sourceCreatorName,
            }),
        );
    } catch (error) {
        console.warn("[dashboardCopilotBootstrap] Failed to persist bootstrap payload:", error);
    }
};

export const clearDashboardCopilotBootstrap = () => {
    try {
        sessionStorage.removeItem(DASHBOARD_COPILOT_BOOTSTRAP_KEY);
    } catch (error) {
        console.warn("[dashboardCopilotBootstrap] Failed to clear bootstrap payload:", error);
    }
};
