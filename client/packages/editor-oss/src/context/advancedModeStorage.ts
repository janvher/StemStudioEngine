const LEGACY_ADVANCED_MODE_KEY = "advancedMode";
const PROJECT_ADVANCED_MODE_PREFIX = "advancedMode:project:";
const PENDING_PROJECT_ADVANCED_MODE_KEY = "advancedMode:pendingProject";

export type AdvancedModePreferenceSource = "project" | "pending" | "aiPromptMode" | "default";

export type ResolvedAdvancedModePreference = {
    value: boolean;
    source: AdvancedModePreferenceSource;
};

function parseStoredBoolean(raw: string | null): boolean | undefined {
    if (raw === null) return undefined;
    try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "boolean" ? parsed : undefined;
    } catch {
        return undefined;
    }
}

function readStorageValue(storage: Storage | undefined, key: string): boolean | undefined {
    if (!storage) return undefined;
    try {
        return parseStoredBoolean(storage.getItem(key));
    } catch {
        return undefined;
    }
}

function writeStorageValue(storage: Storage | undefined, key: string, value: boolean): void {
    if (!storage) return;
    try {
        storage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage failures from private mode, denied access, or quota.
    }
}

function removeStorageValue(storage: Storage | undefined, key: string): void {
    if (!storage) return;
    try {
        storage.removeItem(key);
    } catch {
        // Ignore storage failures from private mode, denied access, or quota.
    }
}

function getSessionStorage(): Storage | undefined {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
}

function getLocalStorage(): Storage | undefined {
    return typeof window === "undefined" ? undefined : window.localStorage;
}

function projectAdvancedModeKey(sceneID: string): string {
    return `${PROJECT_ADVANCED_MODE_PREFIX}${sceneID}`;
}

export function readSessionAdvancedModePreference(): boolean | undefined {
    return readStorageValue(getSessionStorage(), LEGACY_ADVANCED_MODE_KEY);
}

export function readInitialAdvancedModePreference(): boolean {
    return readSessionAdvancedModePreference() ?? true;
}

export function readProjectAdvancedModePreference(sceneID: string | null | undefined): boolean | undefined {
    if (!sceneID) return undefined;
    return readStorageValue(getLocalStorage(), projectAdvancedModeKey(sceneID));
}

export function writeProjectAdvancedModePreference(sceneID: string | null | undefined, value: boolean): void {
    if (!sceneID) return;
    writeStorageValue(getLocalStorage(), projectAdvancedModeKey(sceneID), value);
}

export function writeAdvancedModePreference(value: boolean, sceneID?: string | null): void {
    writeStorageValue(getSessionStorage(), LEGACY_ADVANCED_MODE_KEY, value);
    writeProjectAdvancedModePreference(sceneID, value);
}

export function writePendingProjectAdvancedModePreference(value: boolean): void {
    writeStorageValue(getSessionStorage(), PENDING_PROJECT_ADVANCED_MODE_KEY, value);
    writeStorageValue(getSessionStorage(), LEGACY_ADVANCED_MODE_KEY, value);
}

function consumePendingProjectAdvancedModePreference(): boolean | undefined {
    const storage = getSessionStorage();
    const value = readStorageValue(storage, PENDING_PROJECT_ADVANCED_MODE_KEY);
    removeStorageValue(storage, PENDING_PROJECT_ADVANCED_MODE_KEY);
    return value;
}

export function resolveAdvancedModePreferenceForProject(input: {
    sceneID: string;
    aiPromptMode?: boolean;
    isOSS?: boolean;
}): ResolvedAdvancedModePreference {
    const projectPreference = readProjectAdvancedModePreference(input.sceneID);
    if (projectPreference !== undefined) {
        return {value: projectPreference, source: "project"};
    }

    const pendingPreference = consumePendingProjectAdvancedModePreference();
    if (pendingPreference !== undefined) {
        writeProjectAdvancedModePreference(input.sceneID, pendingPreference);
        return {value: pendingPreference, source: "pending"};
    }

    // OSS ignores the scene's `aiPromptMode` flag — there is no hosted AI
    // copilot to default into, and using that flag to flip the editor's
    // workspace UI made project load non-deterministic (sometimes advanced
    // mode, sometimes AI mode, depending on the scene's persisted flag).
    // Always land in advanced mode unless the user explicitly overrode it.
    if (!input.isOSS && input.aiPromptMode) {
        writeProjectAdvancedModePreference(input.sceneID, false);
        return {value: false, source: "aiPromptMode"};
    }

    writeProjectAdvancedModePreference(input.sceneID, true);
    return {value: true, source: "default"};
}
