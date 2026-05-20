/**
 * useModernMonaco - React hook for modern-monaco integration
 * Provides lazy initialization with Shiki pre-rendering and Monaco API access
 */

import { useState, useCallback, useRef, useEffect } from "react";

import { registerPrettierFormatter } from "./prettierFormatter";
import { getBehaviorTypeDefinitions } from "../typeDefinitions";
import { noSelfAssign } from "../validation";

// Use any for Monaco types to avoid conflicts between monaco-editor and modern-monaco
type MonacoType = any;
type EditorType = any;
type ModelType = any;
type DisposableType = { dispose?: () => void };

export interface UseModernMonacoOptions {
    onReady?: (monaco: MonacoType, editor: EditorType) => void;
}

export interface UseModernMonacoReturn {
    monaco: MonacoType | null;
    editor: EditorType | null;
    isReady: boolean;
    isLoading: boolean;
    error: Error | null;
    initialize: (container: HTMLElement) => Promise<void>;
    dispose: () => void;
}

// ---------------------------------------------------------------------------
// Theme system
// ---------------------------------------------------------------------------

export interface EditorThemeInfo {
    id: string;
    label: string;
    type: "dark" | "light";
}

export const EDITOR_THEMES: EditorThemeInfo[] = [
    // Dark themes
    { id: "monokai", label: "Monokai", type: "dark" },
    { id: "dracula", label: "Dracula", type: "dark" },
    { id: "dracula-soft", label: "Dracula Soft", type: "dark" },
    { id: "dark-plus", label: "Dark+", type: "dark" },
    { id: "github-dark", label: "GitHub Dark", type: "dark" },
    { id: "github-dark-dimmed", label: "GitHub Dark Dimmed", type: "dark" },
    { id: "one-dark-pro", label: "One Dark Pro", type: "dark" },
    { id: "nord", label: "Nord", type: "dark" },
    { id: "tokyo-night", label: "Tokyo Night", type: "dark" },
    { id: "night-owl", label: "Night Owl", type: "dark" },
    { id: "vitesse-dark", label: "Vitesse Dark", type: "dark" },
    { id: "material-theme-darker", label: "Material Darker", type: "dark" },
    { id: "material-theme-ocean", label: "Material Ocean", type: "dark" },
    { id: "material-theme-palenight", label: "Material Palenight", type: "dark" },
    { id: "ayu-dark", label: "Ayu Dark", type: "dark" },
    { id: "synthwave-84", label: "Synthwave '84", type: "dark" },
    { id: "rose-pine", label: "Rosé Pine", type: "dark" },
    { id: "rose-pine-moon", label: "Rosé Pine Moon", type: "dark" },
    { id: "catppuccin-mocha", label: "Catppuccin Mocha", type: "dark" },
    { id: "catppuccin-macchiato", label: "Catppuccin Macchiato", type: "dark" },
    { id: "solarized-dark", label: "Solarized Dark", type: "dark" },
    { id: "poimandres", label: "Poimandres", type: "dark" },
    { id: "houston", label: "Houston", type: "dark" },
    // Light themes
    { id: "light-plus", label: "Light+", type: "light" },
    { id: "github-light", label: "GitHub Light", type: "light" },
    { id: "github-light-default", label: "GitHub Light Default", type: "light" },
    { id: "one-light", label: "One Light", type: "light" },
    { id: "vitesse-light", label: "Vitesse Light", type: "light" },
    { id: "material-theme-lighter", label: "Material Lighter", type: "light" },
    { id: "catppuccin-latte", label: "Catppuccin Latte", type: "light" },
    { id: "rose-pine-dawn", label: "Rosé Pine Dawn", type: "light" },
    { id: "solarized-light", label: "Solarized Light", type: "light" },
    { id: "snazzy-light", label: "Snazzy Light", type: "light" },
    { id: "min-light", label: "Min Light", type: "light" },
    { id: "everforest-light", label: "Everforest Light", type: "light" },
];

const TM_THEMES_VERSION = "1.10.15";
const TM_THEMES_CDN = "https://esm.sh";

// Cache fetched theme JSON to avoid re-fetching
const themeJsonCache = new Map<string, any>();

/**
 *
 * @param themeId
 */
async function fetchThemeJson(themeId: string): Promise<any> {
    if (themeJsonCache.has(themeId)) {
        return themeJsonCache.get(themeId);
    }
    const url = `${TM_THEMES_CDN}/tm-themes@${TM_THEMES_VERSION}/themes/${themeId}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch theme: ${themeId}`);
    const json = await res.json();
    themeJsonCache.set(themeId, json);
    return json;
}

/**
 * Normalize a color to 6-digit hex (no #). Returns null for invalid values.
 * @param raw
 */
function normalizeTokenColor(raw: string): string | null {
    const hex = raw.replace(/^#/, "");
    // Expand 3-digit shorthand: D50 → DD5500
    if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
        return (hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2)).toUpperCase();
    }
    // 6-digit or 8-digit (with alpha) hex
    if (/^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(hex)) {
        return hex;
    }
    return null; // CSS keyword or other unsupported format
}

/**
 *
 * @param themeJson
 */
function convertThemeToMonaco(themeJson: any): any {
    const isDark = themeJson.type === "dark";
    const rules: any[] = [];
    for (const entry of themeJson.tokenColors || []) {
        const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
        for (const s of scopes) {
            if (s && entry.settings?.foreground) {
                const fg = normalizeTokenColor(entry.settings.foreground);
                if (!fg) continue; // Skip rules with non-hex colors (CSS keywords, etc.)
                rules.push({
                    token: s,
                    foreground: fg,
                    fontStyle: entry.settings?.fontStyle,
                });
            }
        }
    }

    const rawColors = themeJson.colors || {};
    // Filter out non-string color values — Monaco's parseHex calls
    // .charCodeAt() which crashes on null/undefined/number values.
    const colors: Record<string, string> = {};
    for (const [key, val] of Object.entries(rawColors)) {
        if (typeof val === "string") {
            colors[key] = val;
        }
    }
    const foreground = colors["editor.foreground"] || (isDark ? "#f8f8f2" : "#333333");

    // Ensure cursor and essential UI colors are always defined so they don't
    // disappear when inherit: false prevents fallback to the base theme.
    if (!colors["editorCursor.foreground"]) {
        colors["editorCursor.foreground"] = foreground;
    }
    if (!colors["editorCursor.background"]) {
        colors["editorCursor.background"] = colors["editor.background"] || (isDark ? "#1e1e1e" : "#ffffff");
    }
    if (!colors["editorSuggestWidget.background"]) {
        colors["editorSuggestWidget.background"] = colors["editor.background"] || (isDark ? "#1e1e1e" : "#ffffff");
    }
    if (!colors["editorSuggestWidget.foreground"]) {
        colors["editorSuggestWidget.foreground"] = foreground;
    }
    if (!colors["editorSuggestWidget.selectedBackground"]) {
        colors["editorSuggestWidget.selectedBackground"] = isDark ? "#094771" : "#c8ddf1";
    }

    // Bracket pair colorization colors (rainbow brackets).
    // When inherit: false these must be defined explicitly.
    const bracketColors = isDark
        ? ["#FFD700", "#DA70D6", "#179FFF", "#FF8C00", "#87CEEB", "#98C379"]
        : ["#0431FA", "#7B3814", "#0C7D15", "#D4A017", "#9400D3", "#E06C75"];
    for (let i = 0; i < bracketColors.length; i++) {
        const key = `editorBracketHighlight.foreground${i + 1}`;
        if (!colors[key]) colors[key] = bracketColors[i]!;
    }
    if (!colors["editorBracketHighlight.unexpectedBracket.foreground"]) {
        colors["editorBracketHighlight.unexpectedBracket.foreground"] = "#FF2222";
    }
    // Bracket pair guide colors
    for (let i = 0; i < bracketColors.length; i++) {
        const key = `editorBracketPairGuide.foreground${i + 1}`;
        if (!colors[key]) colors[key] = bracketColors[i]! + "80"; // 50% alpha
    }

    // Sticky scroll
    if (!colors["editorStickyScroll.background"]) {
        colors["editorStickyScroll.background"] = colors["editor.background"] || (isDark ? "#1e1e1e" : "#ffffff");
    }
    if (!colors["editorStickyScrollHover.background"]) {
        colors["editorStickyScrollHover.background"] = isDark ? "#2a2d2e" : "#f0f0f0";
    }

    // Inlay hints
    if (!colors["editorInlayHint.foreground"]) {
        colors["editorInlayHint.foreground"] = isDark ? "#969696" : "#8a8a8a";
    }
    if (!colors["editorInlayHint.background"]) {
        colors["editorInlayHint.background"] = isDark ? "#2a2d2e80" : "#f0f0f080";
    }

    return {
        base: isDark ? "vs-dark" : "vs",
        inherit: false,
        rules,
        colors,
    };
}

// We redefine the init theme name with new data so that
// StandaloneThemeService.defineTheme auto-applies (it calls internal setTheme
// when this._theme.themeName === themeName, bypassing Shiki's override).
const INIT_THEME_NAME = "monokai";

// Track current active theme ID and colors for external use
let currentThemeId = "monokai";
let currentThemeColors: Record<string, string> | null = null;

/**
 * Apply a theme to all Monaco editors by re-defining the init theme name
 * with new theme data. defineTheme auto-applies when the current theme name
 * matches, which bypasses modern-monaco's Shiki setTheme override.
 * @param monaco
 * @param themeId
 */
export async function applyEditorTheme(monaco: MonacoType, themeId: string): Promise<void> {
    const themeJson = await fetchThemeJson(themeId);
    const monacoTheme = convertThemeToMonaco(themeJson);
    // Always redefine under the init theme name ("monokai").
    // Since the current theme IS "monokai", defineTheme triggers auto-apply
    // via StandaloneThemeService's internal setTheme (not Shiki's override).
    monaco.editor.defineTheme(INIT_THEME_NAME, monacoTheme);
    currentThemeId = themeId;
    currentThemeColors = monacoTheme.colors ?? null;

    // Notify shell components that the theme changed
    window.dispatchEvent(new CustomEvent("ce-theme-changed"));
}

/**
 *
 */
export function getCurrentThemeId(): string {
    return currentThemeId;
}

export interface EditorThemeColors {
    background: string;
    foreground: string;
    borderColor: string;
    sidebarBg: string;
    bgLighter: string;
    tabActiveBorder: string;
}

/**
 * Returns the key UI colors from the currently applied editor theme.
 * Used to style the outer shell (header, sidebar, panels) to match the editor.
 */
export function getEditorThemeColors(): EditorThemeColors | null {
    if (!currentThemeColors) return null;
    const c = currentThemeColors;
    const bg = c["editor.background"] || "#1e1e1e";
    const fg = c["editor.foreground"] || "#d4d4d4";
    const border = c["editorGroup.border"] || c["panel.border"] || c["sideBar.border"] || "#444";

    // Sidebar bg: use sideBar.background if available, otherwise darken editor bg slightly
    let sidebarBg = c["sideBar.background"];
    if (!sidebarBg) {
        // Darken the editor background by subtracting from each channel
        const hex = bg.replace("#", "");
        if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
            const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - 12);
            const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - 12);
            const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - 12);
            sidebarBg = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        } else {
            sidebarBg = bg;
        }
    }

    // Lighter bg for hover states: use activityBar.background or lighten editor bg
    let bgLighter = c["activityBar.background"];
    if (!bgLighter) {
        const hex = bg.replace("#", "");
        if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
            const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + 20);
            const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + 20);
            const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + 20);
            bgLighter = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        } else {
            bgLighter = bg;
        }
    }

    const tabActiveBorder = c["tab.activeBorder"] || c["focusBorder"] || "#0af";

    return { background: bg, foreground: fg, borderColor: border, sidebarBg, bgLighter, tabActiveBorder };
}

// ---------------------------------------------------------------------------
// Module-level singleton for the Monaco API.
// modern-monaco's init() loads themes into an internal themeMap via Shiki.
// Calling init() multiple times would create separate instances where later
// ones may not have the overridden setTheme. Caching ensures a single shared
// instance with both themes pre-loaded.
// ---------------------------------------------------------------------------
let monacoInitPromise: Promise<MonacoType> | null = null;
const MONACO_CONTEXT_ATTRIBUTE = "data-keybinding-context";

/**
 * Remove stale Monaco DOM/context markers from a container before retrying init.
 * This is safe because these containers are dedicated editor mounts.
 * @param container
 */
function resetMonacoContainer(container: HTMLElement | null): void {
    if (!container) return;

    const hasMonacoDom = container.hasAttribute(MONACO_CONTEXT_ATTRIBUTE) ||
        container.querySelector(".monaco-editor") !== null;

    if (!hasMonacoDom) return;

    container.removeAttribute(MONACO_CONTEXT_ATTRIBUTE);
    container.replaceChildren();
}

/**
 *
 */
// A line is considered an @import directive line if it begins with `@import`
// after optional whitespace. We deliberately match the prefix only so that
// half-typed directives still suppress the TS syntax error while the user
// is typing — structural validation runs separately and reports a clean
// "Invalid @import directive" message when the line is genuinely malformed.
const isImportDirectiveLine = (line: string): boolean => /^\s*@import\b/.test(line);

const collectImportDirectiveLines = (code: string): Set<number> => {
    const lines = new Set<number>();
    const split = code.split("\n");
    for (let i = 0; i < split.length; i++) {
        if (isImportDirectiveLine(split[i]!)) {
            lines.add(i + 1);
        }
    }
    return lines;
};

const TS_MARKER_OWNERS = ["typescript", "javascript"];

function installImportDirectiveMarkerFilter(monacoApi: MonacoType): void {
    let filtering = false;
    monacoApi.editor.onDidChangeMarkers((uris: any[]) => {
        if (filtering) return;
        for (const uri of uris) {
            const model = monacoApi.editor.getModel(uri);
            if (!model || model.isDisposed?.()) continue;
            const language = model.getLanguageId?.();
            if (language !== "javascript" && language !== "typescript") continue;

            const importLines = collectImportDirectiveLines(model.getValue());
            if (importLines.size === 0) continue;

            for (const owner of TS_MARKER_OWNERS) {
                const markers = monacoApi.editor.getModelMarkers({resource: uri, owner});
                if (markers.length === 0) continue;
                const filtered = markers.filter((m: any) => !importLines.has(m.startLineNumber));
                if (filtered.length === markers.length) continue;
                filtering = true;
                try {
                    monacoApi.editor.setModelMarkers(model, owner, filtered);
                } finally {
                    filtering = false;
                }
            }
        }
    });
}

function getOrInitMonaco(): Promise<MonacoType> {
    if (!monacoInitPromise) {
        monacoInitPromise = (async () => {
            const modernMonaco = await import("modern-monaco");

            const monacoApi = await modernMonaco.init({
                theme: "monokai",
                langs: ["javascript", "typescript", "json", "html", "css"],
                lsp: {
                    typescript: {
                        compilerOptions: {
                            target: 99, // ESNext
                            module: 99, // ESNext
                            allowNonTsExtensions: true,
                            checkJs: true,
                            allowJs: true,
                            strict: false,
                            noEmit: true,
                        },
                    },
                    json: {
                        allowComments: true,
                        diagnosticsOptions: { validate: true },
                    },
                },
            });

            // Apply user's saved theme preference via defineTheme bypass
            const savedTheme = localStorage.getItem("codeEditorTheme") || "monokai";
            try {
                await applyEditorTheme(monacoApi, savedTheme);
            } catch {
                // Fallback: keep monokai
            }

            // Global handler for TypeScript worker errors when models are disposed
            const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
                if (event.reason?.message?.includes("Could not find source file")) {
                    event.preventDefault();
                }
            };
            window.addEventListener("unhandledrejection", handleUnhandledRejection);

            // Configure JavaScript/TypeScript diagnostics if available
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const monacoLanguages = monacoApi.languages as any;
            if (monacoLanguages?.typescript?.javascriptDefaults) {
                monacoLanguages.typescript.javascriptDefaults.setDiagnosticsOptions({
                    noSemanticValidation: false,
                    noSyntaxValidation: false,
                });

                monacoLanguages.typescript.javascriptDefaults.setCompilerOptions({
                    target: monacoLanguages.typescript.ScriptTarget?.ES2015 ?? 2,
                    allowNonTsExtensions: true,
                    checkJs: true,
                    allowJs: true,
                });

                // Inject type definitions for behavior scripts
                const typeDefinitions = getBehaviorTypeDefinitions();
                const typeDefUri = "ts:filename/behaviors.d.ts";
                monacoLanguages.typescript.javascriptDefaults.addExtraLib(
                    typeDefinitions,
                    typeDefUri,
                );

                // Create a navigable model for type definitions so Go to Definition works
                const modelUri = monacoApi.Uri.parse(typeDefUri);
                if (!monacoApi.editor.getModel(modelUri)) {
                    monacoApi.editor.createModel(typeDefinitions, "typescript", modelUri);
                }

                // Also configure TypeScript defaults (used by LambdaEditor)
                if (monacoLanguages.typescript.typescriptDefaults) {
                    monacoLanguages.typescript.typescriptDefaults.setDiagnosticsOptions({
                        noSemanticValidation: false,
                        noSyntaxValidation: false,
                    });

                    monacoLanguages.typescript.typescriptDefaults.setCompilerOptions({
                        target: monacoLanguages.typescript.ScriptTarget?.ES2015 ?? 2,
                        allowNonTsExtensions: true,
                        checkJs: true,
                        allowJs: true,
                    });

                    monacoLanguages.typescript.typescriptDefaults.addExtraLib(
                        typeDefinitions,
                        typeDefUri,
                    );
                }
            }

            // Register Prettier as the document formatter for JS/TS/JSON
            registerPrettierFormatter(monacoApi);

            // Suppress TS/JS diagnostics on lines that contain a `@import "x" as y`
            // directive. The directive is a custom syntax preprocessed at runtime,
            // so the language service flags it as a syntax error. Module-existence
            // is validated separately via the structureValidator marker owner.
            installImportDirectiveMarkerFilter(monacoApi);

            return monacoApi;
        })();
    }
    return monacoInitPromise;
}

/**
 * Hook for initializing and managing modern-monaco editor
 * @param options
 */
export function useModernMonaco(options: UseModernMonacoOptions = {}): UseModernMonacoReturn {
    const { onReady } = options;

    const [monaco, setMonaco] = useState<MonacoType | null>(null);
    const [editor, setEditor] = useState<EditorType | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const editorRef = useRef<EditorType | null>(null);
    const containerRef = useRef<HTMLElement | null>(null);
    const mountedRef = useRef(true);
    const initInFlightRef = useRef<Promise<void> | null>(null);

    const dispose = useCallback(() => {
        const container = containerRef.current;

        // Dispose editor (not the shared monaco API)
        if (editorRef.current) {
            editorRef.current.dispose();
            editorRef.current = null;
        }

        resetMonacoContainer(container);
        containerRef.current = null;
        initInFlightRef.current = null;

        if (mountedRef.current) {
            setEditor(null);
            setIsReady(false);
            setIsLoading(false);
        }
    }, []);

    const initialize = useCallback(async (container: HTMLElement) => {
        if (editorRef.current && containerRef.current === container) {
            return;
        }

        if (initInFlightRef.current) {
            return initInFlightRef.current;
        }

        if (editorRef.current && containerRef.current !== container) {
            dispose();
        }

        setIsLoading(true);
        setError(null);
        containerRef.current = container;

        const initPromise = (async () => {
            try {
                const monacoApi = await getOrInitMonaco();

                if (!mountedRef.current || containerRef.current !== container) {
                    return;
                }

                setMonaco(monacoApi);

                // A previous failed create() can leave Monaco's context marker on
                // the mount node, causing the next create() to fail immediately.
                resetMonacoContainer(container);

                // Read persisted font preferences
                const savedFontSize = parseInt(localStorage.getItem("codeEditorFontSize") || "14", 10);
                let savedFontFamily = localStorage.getItem("codeEditorFontFamily") || "";

                // Clear stale values for fonts that are no longer available
                if (/Cascadia|Consolas/i.test(savedFontFamily)) {
                    savedFontFamily = "";
                    localStorage.removeItem("codeEditorFontFamily");
                }

                const editorInstance = monacoApi.editor.create(container, {
                    automaticLayout: true,
                    // Glyph margin is enabled later when the real model is set
                    // (in BehaviorEditor's model-setup effect). Enabling it at
                    // creation time causes _computeGlyphMarginLanes to crash
                    // because the internal widget model isn't fully initialized
                    // before the first automatic layout fires.
                    glyphMargin: false,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: savedFontSize || 14,
                    ...(savedFontFamily ? { fontFamily: savedFontFamily } : {}),
                    lineNumbers: "on",
                    folding: true,
                    wordWrap: "on",
                    tabSize: 4,
                    insertSpaces: true,
                    trimAutoWhitespace: true,
                    fixedOverflowWidgets: true,
                    // Bracket pair colorization (rainbow brackets)
                    "bracketPairColorization.enabled": true,
                    // Bracket pair & indentation guides
                    guides: {
                        bracketPairs: true,
                        indentation: true,
                        highlightActiveBracketPair: true,
                        highlightActiveIndentation: true,
                    },
                    // Sticky scroll — pins current scope at top
                    stickyScroll: { enabled: true },
                    // VS Code-like smooth animations
                    smoothScrolling: true,
                    cursorSmoothCaretAnimation: "on",
                    cursorBlinking: "smooth",
                    autoClosingOvertype: "always",
                });

                if (!mountedRef.current || containerRef.current !== container) {
                    editorInstance.dispose();
                    return;
                }

                editorRef.current = editorInstance;
                setEditor(editorInstance);
                setIsReady(true);

                // Ensure Monaco remeasures character widths once web fonts finish loading
                if (savedFontFamily) {
                    document.fonts.ready.then(() => {
                        if (mountedRef.current) {
                            monacoApi.editor.remeasureFonts();
                        }
                    });
                }

                if (onReady) {
                    onReady(monacoApi, editorInstance);
                }
            } catch (err) {
                console.error("Failed to initialize modern-monaco:", err);
                resetMonacoContainer(container);
                if (mountedRef.current) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setIsReady(false);
                }
            } finally {
                initInFlightRef.current = null;
                if (mountedRef.current) {
                    setIsLoading(false);
                }
            }
        })();

        initInFlightRef.current = initPromise;
        return initPromise;
    }, [dispose, onReady]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            dispose();
        };
    }, [dispose]);

    return {
        monaco,
        editor,
        isReady,
        isLoading,
        error,
        initialize,
        dispose,
    };
}

/**
 * Setup custom validation for a model
 * @param monaco
 * @param model
 */
export function setupCustomValidation(
    monaco: MonacoType,
    model: ModelType,
): DisposableType {
    const validate = () => {
        const code = model.getValue();
        const lines = code.split("\n");
        const markers: any[] = [];

        noSelfAssign(lines, markers, monaco);
        monaco.editor.setModelMarkers(model, "customLinter", markers);
    };

    // Run initial validation
    validate();

    // Setup content change listener
    const disposable = model.onDidChangeContent(validate);

    return disposable;
}

/**
 * Map Monaco language IDs to file extensions
 */
export const LANGUAGE_EXTENSIONS: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    json: "json",
    html: "html",
    css: "css",
};

/**
 * Get or create a Monaco model with a unique URI
 * @param monaco
 * @param content
 * @param language
 * @param fileId
 */
export function getOrCreateModel(
    monaco: MonacoType,
    content: string,
    language: string,
    fileId: string,
): ModelType {
    const ext = LANGUAGE_EXTENSIONS[language] || language;
    // Use file:/// scheme so the TypeScript language service treats models as
    // project files — enabling Go to Definition, references, and other
    // semantic features for user-defined functions within the same file.
    const uri = monaco.Uri.parse(`file:///workspace/${fileId}.${ext}`);

    // Check if model already exists
    let model = monaco.editor.getModel(uri);
    if (model) {
        // If language changed, dispose and recreate
        if (model.isDisposed?.() || model.getLanguageId() !== language) {
            model.dispose();
            model = null;
        }
    }

    if (!model) {
        model = monaco.editor.createModel(content, language, uri);
    }
    // NOTE: Don't call setValue here for existing models - content updates
    // are handled by the caller

    return model;
}
