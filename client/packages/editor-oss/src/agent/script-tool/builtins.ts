/**
 * Built-in terminal commands that are handled locally (not routed to CommandsRegistry).
 */

import {getAllHelp, getHelpForTopic} from "./helpData";

export interface TerminalResult {
    output: string;
    status: "success" | "error" | "info";
    format?: "text" | "markdown";
    /** If true, the terminal should exit back to chat mode */
    shouldExit?: boolean;
}

export type BuiltinHandler = (
    params: Record<string, unknown>,
    context: BuiltinContext,
) => Promise<TerminalResult> | TerminalResult;

export interface BuiltinContext {
    /** Whether the caller can run admin-only builtins */
    isAdmin?: boolean;
    /** Full command history for this session */
    commandBuffer: string[];
    /** Callback to clear terminal output */
    clearOutput: () => void;
    /** Callback to run a .stemscript file, optionally with folder files for auto-resolve */
    runScript?: (content: string, folderFiles?: File[]) => Promise<void>;
    /** Last script executed through the terminal, if any */
    getLastScript?: () => {content: string; label?: string} | null;
    /** Callback to validate a script against current scene state */
    runCheck?: (content: string, label?: string) => Promise<TerminalResult>;
    /** Optional test hook/custom picker for a script plus any folder assets */
    pickScriptForExecution?: () => Promise<{content: string; label?: string; folderFiles?: File[]}>;
    /** Callback to trigger file import */
    triggerImport?: (type: string, message?: string, name?: string) => Promise<TerminalResult>;
    /**
     * Callback to export the current scene bundle.
     * @param target - currently only "scene".
     * @param suggestedName - preferred zip name.
     * @param mode - "dump" packages binary assets as files; "export" emits URL refs. Defaults to "dump".
     */
    triggerExport?: (target: string, suggestedName?: string, mode?: "dump" | "export") => Promise<TerminalResult>;
}

const builtins: Record<string, BuiltinHandler> = {
    help: (params) => {
        const topic = params.topic as string | undefined;
        if (topic) {
            return {output: getHelpForTopic(topic), status: "info", format: "markdown"};
        }
        return {output: getAllHelp(), status: "info", format: "markdown"};
    },

    clear: (_params, context) => {
        context.clearOutput();
        return {output: "", status: "success"};
    },

    history: (_params, context) => {
        if (context.commandBuffer.length === 0) {
            return {output: "No commands in history.", status: "info"};
        }
        const lines = context.commandBuffer.map((cmd, i) => `  ${i + 1}. ${cmd}`);
        return {output: `Command history:\n${lines.join("\n")}`, status: "info"};
    },

    exit: () => {
        return {output: "Exiting terminal mode.", status: "info", shouldExit: true};
    },

    exec: async (params, context) => {
        const path = params.path as string | undefined;

        if (path) {
            return {output: "Direct path execution is not supported in browser. Use 'exec' without arguments to open a file picker.", status: "error"};
        }

        try {
            const choice = await showExecPickerDialog();
            if (choice === "cancel") {
                return {output: "Cancelled.", status: "info"};
            }

            if (choice === "file") {
                const file = await pickScriptFile();
                const content = await file.text();
                if (context.runScript) {
                    await context.runScript(content);
                    return {output: `Executed script: ${file.name}`, status: "success"};
                }
                return {output: "Script execution not available.", status: "error"};
            }

            // choice === "folder"
            const folderFiles = await pickFolder();
            const scriptFile = folderFiles.find(f => f.name.toLowerCase().endsWith(".stemscript"));
            if (!scriptFile) {
                return {output: "No .stemscript file found in the selected folder.", status: "error"};
            }
            const content = await scriptFile.text();
            if (context.runScript) {
                await context.runScript(content, folderFiles.filter(f => f !== scriptFile));
                return {output: `Executed script: ${scriptFile.name} (from folder)`, status: "success"};
            }
            return {output: "Script execution not available.", status: "error"};
        } catch (e: any) {
            if (e.name === "AbortError" || e.message === "AbortError") {
                return {output: "File selection cancelled.", status: "info"};
            }
            return {output: `Error opening file: ${e.message}`, status: "error"};
        }
    },

    check: async (params, context) => {
        if (!context.isAdmin) {
            return {output: "`check` is only available in admin mode.", status: "error"};
        }

        if (!context.runCheck) {
            return {output: "Script validation is not available in this context.", status: "error"};
        }

        const mode = params.mode as string | undefined;
        if (mode === "buffer") {
            const commands = context.commandBuffer.filter(command => {
                const normalized = command.trim().toLowerCase();
                return !normalized.startsWith("check") && !normalized.startsWith("test");
            });
            if (commands.length === 0) {
                return {output: "No command history to check.", status: "info"};
            }
            return context.runCheck(commands.join("\n"), "command history");
        }

        if (mode === "exec") {
            return runPickedScriptAndCheck(context, "checking");
        }

        if (mode && mode !== "last") {
            return {output: "Usage: `check`, `check exec`, or `check buffer`.", status: "error"};
        }

        const lastScript = context.getLastScript?.();
        if (!lastScript) {
            return {output: "No previously executed script to check. Run `exec` first, or use `check exec`.", status: "info"};
        }
        return context.runCheck(lastScript.content, lastScript.label);
    },

    test: async (params, context) => {
        if (!context.isAdmin) {
            return {output: "`test` is only available in admin mode.", status: "error"};
        }

        const mode = params.mode as string | undefined;
        if (mode && mode !== "script" && mode !== "exec") {
            return {output: "Usage: `test` or `test script`.", status: "error"};
        }

        return runPickedScriptAndCheck(context, "testing");
    },

    save: async (_params, context) => {
        const commands = context.commandBuffer;
        if (commands.length === 0) {
            return {output: "No commands to save.", status: "info"};
        }

        const content = commands.join("\n") + "\n";

        try {
            if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: "script.stemscript",
                    types: [{
                        description: "StemScript files",
                        accept: {"text/plain": [".stemscript"]},
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
                return {output: `Saved ${commands.length} commands.`, status: "success"};
            } else {
                // Fallback: download via anchor tag
                const blob = new Blob([content], {type: "text/plain"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "script.stemscript";
                a.click();
                URL.revokeObjectURL(url);
                return {output: `Downloaded ${commands.length} commands as script.stemscript`, status: "success"};
            }
        } catch (e: any) {
            if (e.name === "AbortError") {
                return {output: "Save cancelled.", status: "info"};
            }
            return {output: `Error saving file: ${e.message}`, status: "error"};
        }
    },

    import: async (params, context) => {
        const type = params.type as string | undefined;
        if (!type) {
            return {output: "Usage: import <type> <name> [filepath] [\"comment\"]\nTypes: model, behavior, lambda, vfx, image, audio, sound, video, prefab, script", status: "error"};
        }

        const name = params.name as string | undefined;
        const message = params.message as string | undefined;

        if (context.triggerImport) {
            return context.triggerImport(type, message, name);
        }

        return {output: "Import functionality not available in this context.", status: "error"};
    },

    export: async (params, context) => {
        const target = (params.target as string | undefined)?.toLowerCase() || "scene";
        const suggestedName = params.name as string | undefined;

        if (target !== "scene") {
            return {output: "Usage: export scene [name=<bundle-name>]", status: "error"};
        }

        if (context.triggerExport) {
            return context.triggerExport(target, suggestedName, "export");
        }

        const {exportCurrentSceneBundle} = await import("./exportSceneBundle");
        const result = await exportCurrentSceneBundle({suggestedName, mode: "export"});
        return {
            output: result.message,
            status: result.success ? "success" : "error",
        };
    },

    dump: async (params, context) => {
        const target = (params.target as string | undefined)?.toLowerCase() || "scene";
        const suggestedName = params.name as string | undefined;

        if (target !== "scene") {
            return {output: "Usage: dump scene [name=<bundle-name>]", status: "error"};
        }

        if (context.triggerExport) {
            return context.triggerExport(target, suggestedName, "dump");
        }

        const {exportCurrentSceneBundle} = await import("./exportSceneBundle");
        const result = await exportCurrentSceneBundle({suggestedName, mode: "dump"});
        return {
            output: result.message,
            status: result.success ? "success" : "error",
        };
    },
};

/**
 * Check if a command name is a built-in terminal command.
 * @param name
 */
export function isBuiltinCommand(name: string): boolean {
    return name in builtins;
}

/**
 * Execute a built-in terminal command.
 * @param name
 * @param params
 * @param context
 */
export async function executeBuiltin(
    name: string,
    params: Record<string, unknown>,
    context: BuiltinContext,
): Promise<TerminalResult> {
    const handler = builtins[name];
    if (!handler) {
        return {output: `Unknown built-in command: ${name}`, status: "error"};
    }
    return handler(params, context);
}

async function runPickedScriptAndCheck(context: BuiltinContext, actionName: string): Promise<TerminalResult> {
    if (!context.runScript) {
        return {output: "Script execution is not available in this context.", status: "error"};
    }
    if (!context.runCheck) {
        return {output: "Script validation is not available in this context.", status: "error"};
    }

    try {
        const picked = context.pickScriptForExecution
            ? await context.pickScriptForExecution()
            : await pickScriptForExecution();
        await context.runScript(picked.content, picked.folderFiles);
        return context.runCheck(picked.content, picked.label);
    } catch (e: any) {
        if (e.name === "AbortError" || e.message === "AbortError") {
            return {output: "File selection cancelled.", status: "info"};
        }
        return {output: `Error ${actionName} script: ${e.message}`, status: "error"};
    }
}

async function pickScriptForExecution(): Promise<{content: string; label?: string; folderFiles?: File[]}> {
    const choice = await showExecPickerDialog();
    if (choice === "cancel") {
        throw new DOMException("AbortError", "AbortError");
    }

    if (choice === "file") {
        const file = await pickScriptFile();
        return {
            content: await file.text(),
            label: file.name,
        };
    }

    const folderFiles = await pickFolder();
    const scriptFile = folderFiles.find(f => f.name.toLowerCase().endsWith(".stemscript"));
    if (!scriptFile) {
        throw new Error("No .stemscript file found in the selected folder.");
    }

    return {
        content: await scriptFile.text(),
        label: scriptFile.name,
        folderFiles: folderFiles.filter(f => f !== scriptFile),
    };
}

// ── Exec helpers ──────────────────────────────────────────────────

/**
 *
 */
function showExecPickerDialog(): Promise<"file" | "folder" | "cancel"> {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: "fixed", inset: "0",
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: "100000",
            fontFamily: "system-ui, -apple-system, sans-serif",
        } as CSSStyleDeclaration);

        const dialog = document.createElement("div");
        Object.assign(dialog.style, {
            background: "#1e1e2e", color: "#cdd6f4",
            borderRadius: "12px", padding: "24px",
            minWidth: "340px", maxWidth: "420px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        } as CSSStyleDeclaration);

        const title = document.createElement("h3");
        title.textContent = "Execute Script";
        Object.assign(title.style, {margin: "0 0 8px", fontSize: "16px", fontWeight: "600"});

        const desc = document.createElement("p");
        desc.textContent = "Select a single .stemscript file, or a project folder containing a .stemscript and its assets.";
        Object.assign(desc.style, {margin: "0 0 20px", fontSize: "13px", color: "#a6adc8"});

        const btnStyle = (bg: string) => ({
            background: bg, color: bg === "#89b4fa" || bg === "#a6e3a1" ? "#1e1e2e" : "#cdd6f4",
            border: "none", borderRadius: "6px", padding: "10px 16px",
            cursor: "pointer", fontSize: "13px", fontWeight: "500", flex: "1",
        } as CSSStyleDeclaration);

        const btnRow = document.createElement("div");
        Object.assign(btnRow.style, {display: "flex", gap: "10px"});

        const fileBtn = document.createElement("button");
        fileBtn.textContent = "Select Script File";
        Object.assign(fileBtn.style, btnStyle("#89b4fa"));

        const folderBtn = document.createElement("button");
        folderBtn.textContent = "Select Project Folder";
        Object.assign(folderBtn.style, btnStyle("#a6e3a1"));

        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        Object.assign(cancelBtn.style, {...btnStyle("#585b70"), flex: "0"});

        const cleanup = () => {
            document.removeEventListener("keydown", onKey);
            overlay.remove();
        };

        fileBtn.onclick = () => { cleanup(); resolve("file"); };
        folderBtn.onclick = () => { cleanup(); resolve("folder"); };
        cancelBtn.onclick = () => { cleanup(); resolve("cancel"); };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { cleanup(); resolve("cancel"); }
        };
        document.addEventListener("keydown", onKey);

        btnRow.append(fileBtn, folderBtn, cancelBtn);
        dialog.append(title, desc, btnRow);
        overlay.append(dialog);
        document.body.append(overlay);
    });
}

/**
 *
 */
function pickScriptFile(): Promise<File> {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".stemscript,.txt";
        input.onchange = () => {
            const f = input.files?.[0];
            if (f) resolve(f);
            else reject(new DOMException("No file selected", "AbortError"));
        };
        input.addEventListener("cancel", () => reject(new DOMException("File selection cancelled", "AbortError")));
        input.click();
    });
}

/**
 *
 */
function pickFolder(): Promise<File[]> {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.setAttribute("webkitdirectory", "");
        input.onchange = () => {
            const files = Array.from(input.files || []);
            if (files.length === 0) reject(new DOMException("No folder selected", "AbortError"));
            else resolve(files);
        };
        input.addEventListener("cancel", () => reject(new DOMException("Folder selection cancelled", "AbortError")));
        input.click();
    });
}
