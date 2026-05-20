export type CopilotPreviewRuntimeError = {
    previewId: string;
    message: string;
    timestamp: number;
};

const runtimeErrors: CopilotPreviewRuntimeError[] = [];

const MAX_RUNTIME_ERRORS = 20;

export const recordCopilotPreviewRuntimeError = (
    previewId: string,
    message: string,
    timestamp: number = Date.now(),
): void => {
    runtimeErrors.push({
        previewId,
        message,
        timestamp,
    });

    if (runtimeErrors.length > MAX_RUNTIME_ERRORS) {
        runtimeErrors.splice(0, runtimeErrors.length - MAX_RUNTIME_ERRORS);
    }
};

export const clearCopilotPreviewRuntimeErrors = (previewId: string): void => {
    for (let index = runtimeErrors.length - 1; index >= 0; index -= 1) {
        if (runtimeErrors[index]?.previewId === previewId) {
            runtimeErrors.splice(index, 1);
        }
    }
};

export const getCopilotPreviewRuntimeErrors = (
    previewId: string,
    sinceTimestamp: number = 0,
): CopilotPreviewRuntimeError[] =>
    runtimeErrors.filter(error => error.previewId === previewId && error.timestamp >= sinceTimestamp);
