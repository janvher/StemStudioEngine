/**
 * ImportBatchDialog — Pure-DOM modal that lists all import requests from a
 * .stemscript file and lets the user pick files one-by-one or auto-detect
 * from a folder.  Each "Select File" button is a fresh user gesture so the
 * browser's file picker opens reliably.
 *
 * Resolves with:
 *   - {action: "import", files: Map} on "Import All"
 *   - {action: "skip"}              on "Skip All" (skip imports, continue script)
 *   - {action: "cancel"}            on "Cancel" or Escape (abort entire script)
 */

import type {ImportRequest} from "./ScriptExecutor";

export interface BatchImportResult {
    action: "import" | "skip" | "cancel";
    files: Map<number, File>;
    companionFiles: Map<number, File[]>;
}

export interface AutoResolveResult {
    files: Map<number, File>;
    companionFiles: Map<number, File[]>;
}

/**
 * Auto-resolve import requests against a list of folder files.
 * Returns maps of resolved main files and companion files by import index.
 */
/** Unique key for a file — uses the full relative path when available so that
 *  files with the same name in different subdirectories are tracked independently
 * @param f
 *  (e.g. `behaviors/chessGame/behavior.yaml` vs `behaviors/chessCamera/behavior.yaml`). */
function fileKey(f: File): string {
    return f.webkitRelativePath || f.name;
}

/**
 *
 * @param imports
 * @param folderFiles
 */
export function autoResolveImports(
    imports: ImportRequest[],
    folderFiles: File[],
): AutoResolveResult {
    const COMPANION_EXTS = [".bin", ".png", ".jpg", ".jpeg", ".webp", ".tga", ".bmp"];
    const files = new Map<number, File>();
    const companionFiles = new Map<number, File[]>();
    const claimed = new Set<string>();

    for (const req of imports) {
        const extOf = (f: File) => req.extensions.some(ext => f.name.toLowerCase().endsWith(ext));

        let match: File | null = null;

        // An explicit filepath wins and may reuse a file already claimed by
        // another import: one asset file can legitimately back several imports
        // (e.g. four wheels all referencing wheel.glb, or one image reused as a
        // texture and the scene thumbnail). Matching only *unclaimed* files left
        // those duplicates unresolved, which popped a blocking import dialog and
        // hung headless / automated imports. So resolve filepath against the
        // full file list, not the claimed-filtered subset.
        if (req.filepath) {
            match = findByFilepath(folderFiles.filter(extOf), req.filepath);
        }

        if (!match) {
            // Fuzzy fallback only considers still-unclaimed files so two
            // ambiguous imports don't grab the same file.
            const extMatches = folderFiles.filter(f => !claimed.has(fileKey(f)) && extOf(f));
            if (extMatches.length === 1) {
                match = extMatches[0]!;
            } else if (req.name) {
                match = findBestMatch(extMatches, req.name);
            }
            if (!match && req.message) {
                match = findBestMatch(extMatches, req.message);
            }
        }

        if (match) {
            // Skip 0-byte files — likely corrupt or incomplete downloads
            if (match.size === 0) {
                match = null;
            }
        }
        if (match) {
            claimed.add(fileKey(match));
            files.set(req.index, match);

            if (req.type === "model" && match.name.toLowerCase().endsWith(".gltf")) {
                const matchDir = (match.webkitRelativePath || "").replace(/[^/]+$/, "");
                const companions = folderFiles.filter(f => {
                    if (f === match || claimed.has(fileKey(f))) return false;
                    const fDir = (f.webkitRelativePath || "").replace(/[^/]+$/, "");
                    if (matchDir && fDir !== matchDir) return false;
                    return COMPANION_EXTS.some(ext => f.name.toLowerCase().endsWith(ext));
                });
                if (companions.length > 0) {
                    companionFiles.set(req.index, companions);
                    for (const c of companions) claimed.add(fileKey(c));
                }
            }
        }
    }

    return {files, companionFiles};
}

/**
 *
 * @param imports
 * @param preResolved
 */
export function showBatchImportDialog(
    imports: ImportRequest[],
    preResolved?: AutoResolveResult,
): Promise<BatchImportResult> {
    const MODEL_EXTS = [".gltf", ".glb", ".fbx", ".obj"];

    return new Promise(resolve => {
        const selected = new Map<number, File>();
        const selectedCompanions = new Map<number, File[]>();

        // ── Overlay ──────────────────────────────────────────────
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: "fixed",
            inset: "0",
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "100000",
            fontFamily: "system-ui, -apple-system, sans-serif",
        } as CSSStyleDeclaration);

        // ── Dialog box ───────────────────────────────────────────
        const dialog = document.createElement("div");
        Object.assign(dialog.style, {
            background: "#1e1e2e",
            color: "#cdd6f4",
            borderRadius: "12px",
            padding: "24px",
            minWidth: "420px",
            maxWidth: "560px",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        } as CSSStyleDeclaration);

        // ── Header ───────────────────────────────────────────────
        const header = document.createElement("div");
        Object.assign(header.style, {display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px"});
        const title = document.createElement("h2");
        title.textContent = `Import Assets (${imports.length} required)`;
        Object.assign(title.style, {margin: "0", fontSize: "18px", fontWeight: "600"});
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "\u00d7";
        Object.assign(closeBtn.style, {background: "none", border: "none", color: "#cdd6f4", fontSize: "24px", cursor: "pointer", padding: "0 4px"});
        closeBtn.onclick = () => cleanup("cancel");
        header.append(title, closeBtn);
        dialog.append(header);

        // ── Select Folder button ─────────────────────────────────
        const folderBtn = document.createElement("button");
        folderBtn.textContent = "Select Folder to Auto-Detect";
        styleButton(folderBtn, "#585b70");
        Object.assign(folderBtn.style, {width: "100%", marginBottom: "16px"});
        folderBtn.onclick = () => {
            const input = document.createElement("input");
            input.type = "file";
            input.setAttribute("webkitdirectory", "");
            input.onchange = () => {
                const files = Array.from(input.files || []);
                // Only resolve imports not already selected
                const unresolved = imports.filter(r => !selected.has(r.index));
                const result = autoResolveImports(unresolved, files);
                for (const [idx, file] of result.files) {
                    selected.set(idx, file);
                    updateRow(idx, file);
                }
                for (const [idx, companions] of result.companionFiles) {
                    selectedCompanions.set(idx, companions);
                }
                refreshImportBtn();
            };
            input.click();
        };
        dialog.append(folderBtn);

        // ── Import rows ──────────────────────────────────────────
        const statusEls: HTMLSpanElement[] = [];
        const rows: HTMLDivElement[] = [];

        for (const req of imports) {
            const row = document.createElement("div");
            Object.assign(row.style, {
                borderTop: "1px solid #313244",
                padding: "12px 0",
            } as CSSStyleDeclaration);

            const label = document.createElement("div");
            label.style.marginBottom = "4px";
            const parts = [`<strong>${req.index + 1}. ${req.type}</strong>`];
            if (req.name) parts.push(` <span style="color:#89b4fa;font-weight:500">${escapeHtml(req.name)}</span>`);
            if (req.filepath) parts.push(` <code style="font-size:12px;background:#313244;padding:1px 5px;border-radius:3px">${escapeHtml(req.filepath)}</code>`);
            if (req.message) parts.push(` &mdash; &ldquo;${escapeHtml(req.message)}&rdquo;`);
            label.innerHTML = parts.join("");

            const extLine = document.createElement("div");
            extLine.textContent = req.extensions.join(", ");
            Object.assign(extLine.style, {fontSize: "12px", color: "#7f849c", marginBottom: "8px"});

            const actionRow = document.createElement("div");
            Object.assign(actionRow.style, {display: "flex", alignItems: "center", gap: "10px"});

            const selectBtn = document.createElement("button");
            selectBtn.textContent = "Select File";
            styleButton(selectBtn, "#45475a");
            selectBtn.onclick = () => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = req.extensions.join(",");
                if (req.type === "model") {
                    input.multiple = true;
                    // Widen accept to include companion file types
                    input.accept = [...req.extensions, ".bin", ".png", ".jpg", ".jpeg", ".webp"].join(",");
                }
                input.onchange = () => {
                    const files = Array.from(input.files || []);
                    if (files.length === 0) return;

                    if (req.type === "model" && files.length > 1) {
                        // First file matching a model extension is the main file; rest are companions
                        const mainFile = files.find(f => MODEL_EXTS.some(ext => f.name.toLowerCase().endsWith(ext))) || files[0]!;
                        const companions = files.filter(f => f !== mainFile);
                        selected.set(req.index, mainFile);
                        if (companions.length > 0) selectedCompanions.set(req.index, companions);
                        updateRow(req.index, mainFile);
                    } else {
                        selected.set(req.index, files[0]!);
                        updateRow(req.index, files[0]!);
                    }
                    refreshImportBtn();
                };
                input.click();
            };

            const status = document.createElement("span");
            status.textContent = "\u23f3 Not selected";
            Object.assign(status.style, {fontSize: "13px", color: "#a6adc8"});
            statusEls.push(status);

            actionRow.append(selectBtn, status);
            row.append(label, extLine, actionRow);
            rows.push(row);
            dialog.append(row);
        }

        // ── Footer buttons ───────────────────────────────────────
        const footer = document.createElement("div");
        Object.assign(footer.style, {display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", borderTop: "1px solid #313244", paddingTop: "16px"});

        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        styleButton(cancelBtn, "#f38ba8");
        cancelBtn.style.color = "#1e1e2e";
        cancelBtn.onclick = () => cleanup("cancel");

        const skipBtn = document.createElement("button");
        skipBtn.textContent = "Skip All";
        styleButton(skipBtn, "#585b70");
        skipBtn.onclick = () => cleanup("skip");

        const importBtn = document.createElement("button");
        importBtn.textContent = "Import All";
        styleButton(importBtn, "#89b4fa");
        importBtn.style.color = "#1e1e2e";
        importBtn.onclick = () => {
            const missing = imports.filter(r => !selected.has(r.index));
            if (missing.length > 0) {
                const names = missing.map(r => `  - ${r.type}${r.name ? ` ${r.name}` : ""}${r.message ? ` ("${r.message}")` : ""}`).join("\n");
                const proceed = window.confirm(
                    `${missing.length} import(s) not resolved:\n${names}\n\nContinue without them? Click Cancel to go back and select files.`,
                );
                if (!proceed) return;
            }
            cleanup("import");
        };

        footer.append(cancelBtn, skipBtn, importBtn);
        dialog.append(footer);

        overlay.append(dialog);
        document.body.append(overlay);

        // Close on Escape
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") cleanup("cancel");
        };
        document.addEventListener("keydown", onKey);

        // ── helpers ──────────────────────────────────────────────
        /**
         *
         * @param index
         * @param file
         */
        function updateRow(index: number, file: File) {
            const el = statusEls[index];
            if (!el) return;
            if (file.size === 0) {
                el.textContent = `\u26a0 ${file.name} (0 bytes — empty file, please re-select)`;
                el.style.color = "#f38ba8";
                selected.delete(index);
                refreshImportBtn();
                return;
            }
            const sizeStr = file.size < 1024 ? `${file.size} B` : file.size < 1048576 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / 1048576).toFixed(1)} MB`;
            el.textContent = `\u2713 ${file.name} (${sizeStr})`;
            el.style.color = "#a6e3a1";
        }

        /**
         *
         */
        function refreshImportBtn() {
            const allDone = imports.every(r => selected.has(r.index));
            importBtn.style.opacity = allDone ? "1" : "0.6";
        }

        /**
         *
         * @param action
         */
        function cleanup(action: "import" | "skip" | "cancel") {
            document.removeEventListener("keydown", onKey);
            overlay.remove();
            resolve({action, files: selected, companionFiles: selectedCompanions});
        }

        // Pre-populate from preResolved if provided
        if (preResolved) {
            for (const [idx, file] of preResolved.files) {
                selected.set(idx, file);
                updateRow(idx, file);
            }
            for (const [idx, companions] of preResolved.companionFiles) {
                selectedCompanions.set(idx, companions);
            }
        }

        refreshImportBtn();
    });
}

// ── Utilities ────────────────────────────────────────────────────

/**
 *
 * @param btn
 * @param bg
 */
function styleButton(btn: HTMLButtonElement, bg: string) {
    Object.assign(btn.style, {
        background: bg,
        color: "#cdd6f4",
        border: "none",
        borderRadius: "6px",
        padding: "8px 16px",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: "500",
    } as CSSStyleDeclaration);
}

/**
 *
 * @param str
 */
function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Try to match a single file from candidates using the import message.
 * Returns the file only if there's a confident match (filename contains
 * all significant words from the message). Returns null otherwise.
 * @param candidates
 * @param message
 */
export function findBestMatch(candidates: File[], message: string): File | null {
    // Extract significant words (3+ chars, lowercased) from the message
    const words = message.toLowerCase().split(/[\s_\-./]+/).filter(w => w.length >= 3);
    if (words.length === 0) return null;

    // Score each candidate by how many message words appear in its filename
    let bestFile: File | null = null;
    let bestScore = 0;
    for (const file of candidates) {
        const name = file.name.toLowerCase().replace(/\.[^.]+$/, ""); // strip extension
        const score = words.filter(w => name.includes(w)).length;
        if (score > bestScore) {
            bestScore = score;
            bestFile = file;
        }
    }

    // Only return if all words matched (100% confident)
    if (bestScore === words.length && bestFile) return bestFile;
    return null;
}

/**
 * Try to match a file by its filepath hint.
 * Checks webkitRelativePath (ends with the filepath) or exact filename match.
 * @param candidates
 * @param filepath
 */
export function findByFilepath(candidates: File[], filepath: string): File | null {
    const normalized = filepath.replace(/\\/g, "/").toLowerCase();
    const basename = normalized.split("/").pop() || "";

    // Prefer full path match via webkitRelativePath
    for (const file of candidates) {
        const rel = (file.webkitRelativePath || "").replace(/\\/g, "/").toLowerCase();
        if (rel.endsWith(normalized)) return file;
    }
    // Fall back to filename-only match
    for (const file of candidates) {
        if (file.name.toLowerCase() === basename) return file;
    }
    return null;
}
