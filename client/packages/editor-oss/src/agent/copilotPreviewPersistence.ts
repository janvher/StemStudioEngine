export type CopilotPreviewPersistenceState = {
    previewId: string;
    label?: string;
};

let activePreview: CopilotPreviewPersistenceState | null = null;
let saveAllowanceDepth = 0;

export const setActiveCopilotPreviewPersistence = (state: CopilotPreviewPersistenceState): void => {
    activePreview = state;
};

export const clearActiveCopilotPreviewPersistence = (previewId?: string): void => {
    if (previewId && activePreview?.previewId !== previewId) return;
    activePreview = null;
};

export const getActiveCopilotPreviewPersistence = (): CopilotPreviewPersistenceState | null => activePreview;

export const isCopilotPreviewSceneSaveBlocked = (): boolean =>
    activePreview !== null && saveAllowanceDepth === 0;

export const runWithCopilotPreviewSceneSaveAllowed = async <T>(fn: () => Promise<T> | T): Promise<T> => {
    saveAllowanceDepth += 1;
    try {
        return await fn();
    } finally {
        saveAllowanceDepth = Math.max(0, saveAllowanceDepth - 1);
    }
};
