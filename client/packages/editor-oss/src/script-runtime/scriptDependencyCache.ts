export type ScriptDependencyOwnerType = "behavior" | "lambda" | "import";

export interface ScriptDependencyEntry {
    assetId: string;
    revisionId: string;
    ownerType: ScriptDependencyOwnerType;
    dependencies: Record<string, string>;
}

const scriptDependencyEntries = new Map<string, ScriptDependencyEntry>();

const getEntryKey = (assetId: string, revisionId: string) => `${assetId}:${revisionId}`;

export const seedScriptDependencyEntry = (entry: ScriptDependencyEntry): void => {
    scriptDependencyEntries.set(getEntryKey(entry.assetId, entry.revisionId), entry);
};

export const getScriptDependencyEntry = (
    assetId: string,
    revisionId: string,
): ScriptDependencyEntry | null => {
    return scriptDependencyEntries.get(getEntryKey(assetId, revisionId)) || null;
};

export const removeScriptDependencyEntriesForAsset = (assetId: string): void => {
    for (const key of scriptDependencyEntries.keys()) {
        if (key.startsWith(`${assetId}:`)) {
            scriptDependencyEntries.delete(key);
        }
    }
};

export const clearScriptDependencyEntries = (): void => {
    scriptDependencyEntries.clear();
};
