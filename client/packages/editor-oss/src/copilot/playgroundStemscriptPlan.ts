import {isReadOnlyCommand} from "../agent/script-tool/checkScript";
import {ScriptExecutor} from "../agent/script-tool/ScriptExecutor";

export interface PlaygroundStemscriptPlan {
    inspectionStemscript: string;
    reply: string;
    stemscript: string;
    notes: string[];
}

export interface ValidatedStemscript {
    script: string;
    executableCommands: number;
}

const STEMSCRIPT_FENCE_RE = /```(?:stemscript|text|txt)?\s*([\s\S]*?)```/i;
const DISALLOWED_COMMANDS = new Set([
    "add_prefab_to_scene",
    "create_prefab",
    "exec",
    "export",
    "generate_3d_model",
    "get_library_asset",
    "import",
    "list_project_tasks",
    "create_project_task",
    "update_project_task",
    "delete_project_task",
    "require",
    "save",
    "search_external_assets",
    "search_local_assets",
    "add_model_to_scene",
    "set_external_texture",
]);
// Inspection allows any command the engine classifies as read-only
// (get_/list_/search_ + player/select via isReadOnlyCommand), so the copilot
// can inspect the full scene and every asset type — except commands the
// playground globally disallows (external search, library, project tasks).
const isAllowedInspectionCommand = (command: string): boolean =>
    isReadOnlyCommand(command) && !DISALLOWED_COMMANDS.has(command);

const stripCodeFence = (value: string): string => {
    const trimmed = value.trim();
    const match = trimmed.match(STEMSCRIPT_FENCE_RE);
    return (match?.[1] ?? trimmed).trim();
};

const tryParseJsonObject = (value: string): unknown | null => {
    const trimmed = stripCodeFence(value);
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;

    try {
        return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
        return null;
    }
};

const stringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const commandArrayToScript = (value: unknown): string => {
    if (!Array.isArray(value)) return "";
    return value
        .map(item => {
            if (typeof item === "string") return item;
            if (!item || typeof item !== "object") return "";
            const record = item as Record<string, unknown>;
            const command = typeof record.command === "string" ? record.command.trim() : "";
            const params = record.params && typeof record.params === "object"
                ? Object.entries(record.params as Record<string, unknown>)
                    .map(([key, param]) => `${key}=${formatParamValue(param)}`)
                    .join(" ")
                : "";
            return [command, params].filter(Boolean).join(" ");
        })
        .filter(line => line.trim().length > 0)
        .join("\n");
};

const formatParamValue = (value: unknown): string => {
    if (typeof value === "string") {
        if (/^[A-Za-z0-9_.:#/-]+$/.test(value)) return value;
        return JSON.stringify(value);
    }
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return JSON.stringify(value);
};

export function parseProviderStemscriptPlan(rawText: string): PlaygroundStemscriptPlan {
    const parsed = tryParseJsonObject(rawText);
    if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        const commands = commandArrayToScript(record.commands);
        const stemscript =
            typeof record.stemscript === "string"
                ? record.stemscript
                : typeof record.script === "string"
                  ? record.script
                  : commands;
        const inspectionStemscript =
            typeof record.inspectionStemscript === "string"
                ? record.inspectionStemscript
                : typeof record.inspectionScript === "string"
                  ? record.inspectionScript
                  : typeof record.inspectStemscript === "string"
                    ? record.inspectStemscript
                    : commandArrayToScript(record.inspectionCommands ?? record.queries);

        return {
            inspectionStemscript: stripCodeFence(inspectionStemscript || ""),
            reply: typeof record.reply === "string" ? record.reply.trim() : "",
            stemscript: stripCodeFence(stemscript || ""),
            notes: stringArray(record.notes),
        };
    }

    const fenced = rawText.match(STEMSCRIPT_FENCE_RE);
    if (fenced?.[1]) {
        return {
            inspectionStemscript: "",
            reply: rawText.replace(fenced[0], "").trim(),
            stemscript: stripCodeFence(fenced[1]),
            notes: [],
        };
    }

    return {
        inspectionStemscript: "",
        reply: rawText.trim(),
        stemscript: "",
        notes: [],
    };
}

export function validateGeneratedStemscript(script: string): ValidatedStemscript {
    return validateStemscript(script, command => DISALLOWED_COMMANDS.has(command));
}

export function validateInspectionStemscript(script: string): ValidatedStemscript {
    return validateStemscript(script, command => !isAllowedInspectionCommand(command), "inspection");
}

function validateStemscript(
    script: string,
    isDisallowedCommand: (command: string) => boolean,
    label = "playground copilot mode",
): ValidatedStemscript {
    const normalized = stripCodeFence(script)
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join("\n");

    if (!normalized) {
        return {script: "", executableCommands: 0};
    }

    const lines = ScriptExecutor.parseScript(normalized);
    const disallowed: string[] = [];
    let executableCommands = 0;

    for (const line of lines) {
        const parsed = line.parsed;
        if (!parsed || line.isComment || line.isEmpty) continue;

        executableCommands++;
        if (parsed.isBuiltin || isDisallowedCommand(parsed.command)) {
            disallowed.push(`line ${line.lineNumber}: ${parsed.raw}`);
        }
    }

    if (disallowed.length > 0) {
        throw new Error(
            `Generated StemScript used commands that are not allowed in ${label}: ${disallowed.join("; ")}`,
        );
    }

    return {script: normalized, executableCommands};
}
