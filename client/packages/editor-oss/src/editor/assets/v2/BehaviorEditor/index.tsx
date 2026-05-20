/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React, {useEffect, useCallback, useState, useRef, useMemo, type ChangeEvent} from "react";
import {HiOutlineArrowDownTray, HiOutlineCheckCircle, HiOutlineInformationCircle} from "react-icons/hi2";

import {
    Container,
    DebuggerBanner,
    Tab,
    TabText,
    Toolbar,
    ToolbarScrollViewport,
    ToolbarScrollContent,
    ToolbarScrollButton,
    ThemeSelect,
    FontSelect,
    FormatBtn,
} from "./BehaviorEditor.style";
import {breakpointManager} from "./breakpoints";
import {FileIcon} from "./FileIcon";
import {runImporterValidation} from "./importerValidation";
import {registerIntellijKeybindings} from "./intellijKeybindings";
import {KeybindingsPanel} from "./KeybindingsPanel";
import {registerScriptCompletions} from "./scriptCompletions";
import {validateImportResolution, validateScript} from "./structureValidation";
import ValidationResultsPanel from "./ValidationResultsPanel";
import {useModernMonaco, setupCustomValidation, getOrCreateModel, applyEditorTheme, EDITOR_THEMES} from "./workspace";
import global from "@stem/editor-oss/global";
import {Tooltip} from "../common/Tooltip";

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

// Use any for Monaco types to avoid conflicts between monaco-editor and modern-monaco
type DisposableType = {dispose?: () => void};
type ModelType = {isDisposed?: () => boolean};

const isUsableModel = (model: ModelType | null | undefined): boolean => {
    if (!model) return false;
    return !model.isDisposed?.();
};

const canFocusContainer = (container: HTMLDivElement | null): container is HTMLDivElement => {
    if (!container?.isConnected) return false;

    const style = container.ownerDocument.defaultView?.getComputedStyle(container);
    if (!style || style.display === "none" || style.visibility === "hidden") {
        return false;
    }

    const rect = container.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
};

/**
 *
 * @param model
 * @param nextValue
 */
function applyServerContent(model: any, nextValue: string) {
    const currentValue = model.getValue();

    if (currentValue === nextValue) return;

    model.pushEditOperations(
        [],
        [
            {
                range: model.getFullModelRange(),
                text: nextValue,
            },
        ],
        () => null,
    );
}

type BehaviorEditorFile = {
    id: string;
    name: string;
    language: string;
    content: string;
    isReadOnly?: boolean;
    // Increment this to force an external content update (e.g., AI edit, revert).
    // Content is applied when file ID changes OR when this version changes.
    contentVersion?: number;
};

export type BehaviorEditorProps = {
    files: BehaviorEditorFile[];
    initialSelectedId?: string;
    initialLineNumber?: number;
    onFileContentChange: (fileId: string, content: string) => void;
    /** Show toolbar with theme selection, format, validate buttons */
    showToolbar?: boolean;
    /** Script type for validation (behavior or lambda) */
    scriptType?: "behavior" | "lambda";
    /** Optional export handler - shows Export button in toolbar when provided */
    onExport?: () => void;
    /** Whether the export button should be disabled */
    exportDisabled?: boolean;
    /** Tooltip text when export is disabled */
    exportDisabledReason?: string;
    disabled?: boolean;
    /**
     * Specifiers that resolve to existing Import assets. Should contain both
     * raw asset IDs and lowercased asset names. When provided, the editor
     * shows a live error squiggle on `@import "x" as y` lines whose target
     * module does not exist in the current scene.
     */
    availableImportSpecifiers?: ReadonlySet<string>;
};

const BehaviorEditor: React.FC<BehaviorEditorProps> = ({
    files,
    initialSelectedId,
    initialLineNumber,
    onFileContentChange,
    showToolbar = false,
    scriptType = "behavior",
    onExport,
    exportDisabled = false,
    disabled = false,
    exportDisabledReason,
    availableImportSpecifiers,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [pendingLineNumber, setPendingLineNumber] = useState<number | undefined>(undefined);
    const [breakpointsCount, setBreakpointsCount] = useState(0);
    const decorationsRef = useRef<string[]>([]);
    const hoverLineRef = useRef<number | null>(null);
    const eventDisposablesRef = useRef<DisposableType[]>([]);
    const isProgrammaticChangeRef = useRef(false);
    const isMountedRef = useRef(true);
    // Track the last applied content version per file to detect external updates
    const appliedVersionRef = useRef<Map<string, number>>(new Map());
    // Track the last file ID we applied content to, to detect file switches
    const lastAppliedFileIdRef = useRef<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | undefined>(initialSelectedId);
    const selectedFile = useMemo(() => files.find(f => f.id === selectedId), [files, selectedId]);

    // Validation results panel state — keyed by file ID so results persist across tab switches
    const [validationResults, setValidationResults] = useState<Map<string, Array<{severity: "Error" | "Warning" | "Info"; startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number; message: string}>>>(new Map());
    const [showValidationPanel, setShowValidationPanel] = useState(false);
    const currentFileMarkers = useMemo(() => (selectedId ? validationResults.get(selectedId) ?? [] : []), [selectedId, validationResults]);

    // Toolbar state
    const keybindingsBtnRef = useRef<HTMLButtonElement>(null);
    const toolbarViewportRef = useRef<HTMLDivElement>(null);
    const [showKeybindings, setShowKeybindings] = useState(false);
    const [editorTheme, setEditorTheme] = useState(() => localStorage.getItem("codeEditorTheme") || "monokai");
    const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem("codeEditorFontSize") || "14", 10));
    const [fontFamily, setFontFamily] = useState(() => localStorage.getItem("codeEditorFontFamily") || "");
    const [isToolbarOverflowing, setIsToolbarOverflowing] = useState(false);
    const [canScrollToolbarLeft, setCanScrollToolbarLeft] = useState(false);
    const [canScrollToolbarRight, setCanScrollToolbarRight] = useState(false);
    const darkThemes = useMemo(() => EDITOR_THEMES.filter(t => t.type === "dark"), []);
    const lightThemes = useMemo(() => EDITOR_THEMES.filter(t => t.type === "light"), []);

    const {monaco, editor, isReady, initialize} = useModernMonaco();

    const updateToolbarScrollState = useCallback(() => {
        const viewport = toolbarViewportRef.current;
        if (!viewport) {
            setIsToolbarOverflowing(false);
            setCanScrollToolbarLeft(false);
            setCanScrollToolbarRight(false);
            return;
        }

        const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const scrollLeft = Math.max(0, viewport.scrollLeft);
        const hasOverflow = maxScrollLeft > 1;

        setIsToolbarOverflowing(hasOverflow);
        setCanScrollToolbarLeft(hasOverflow && scrollLeft > 1);
        setCanScrollToolbarRight(hasOverflow && scrollLeft < maxScrollLeft - 1);
    }, []);

    const handleToolbarScroll = useCallback((direction: "left" | "right") => {
        const viewport = toolbarViewportRef.current;
        if (!viewport) return;

        const scrollAmount = Math.max(viewport.clientWidth * 0.6, 120);
        viewport.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
        });
    }, []);

    // Handle initialSelectedId prop changes
    useEffect(() => {
        if (initialSelectedId) {
            setSelectedId(initialSelectedId);
        }
    }, [initialSelectedId]);

    // Handle initialLineNumber prop changes
    useEffect(() => {
        if (initialLineNumber && initialLineNumber > 0) {
            setPendingLineNumber(initialLineNumber);
        }
    }, [initialLineNumber]);

    useEffect(() => {
        if (!showToolbar) {
            setIsToolbarOverflowing(false);
            setCanScrollToolbarLeft(false);
            setCanScrollToolbarRight(false);
            return;
        }

        const viewport = toolbarViewportRef.current;
        if (!viewport) return;

        updateToolbarScrollState();

        const handleScroll = () => updateToolbarScrollState();
        viewport.addEventListener("scroll", handleScroll, {passive: true});

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => updateToolbarScrollState());
            resizeObserver.observe(viewport);

            if (viewport.firstElementChild instanceof HTMLElement) {
                resizeObserver.observe(viewport.firstElementChild);
            }
        }

        return () => {
            viewport.removeEventListener("scroll", handleScroll);
            resizeObserver?.disconnect();
        };
    }, [showToolbar, onExport, updateToolbarScrollState]);

    // Initialize Monaco when container is ready
    useEffect(() => {
        if (containerRef.current && !isReady) {
            void initialize(containerRef.current);
        }
    }, [initialize, isReady]);

    useEffect(() => {
        if (!isReady || !editor || !selectedFile || disabled) return;

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let rafId: number | null = null;
        let attempts = 0;

        const focusWhenVisible = () => {
            if (!editor || disabled) return;

            if (!canFocusContainer(containerRef.current)) {
                if (attempts < 12) {
                    attempts += 1;
                    rafId = requestAnimationFrame(focusWhenVisible);
                }
                return;
            }

            editor.layout();
            editor.focus();
        };

        // Delay focus slightly to avoid click hijack, then retry until the
        // editor is actually visible. This covers inline load overlays and
        // popout windows that finish rendering a frame later.
        timeoutId = setTimeout(() => {
            rafId = requestAnimationFrame(focusWhenVisible);
        }, 50);

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [disabled, isReady, editor, selectedFile?.id]);

    // Popout cursor fix — Monaco's internal getActiveDocument() only knows the
    // main window, so refreshFocusState() always concludes the editor is
    // unfocused in a popout, hiding the cursor. We fix this with two layers:
    //   1) Monkey-patch refreshFocusState to a no-op (DOM focus/blur events
    //      still set focus state correctly).
    //   2) MutationObserver that overrides visibility:hidden on cursor elements
    //      whenever the editor genuinely has DOM focus (robust fallback).
    useEffect(() => {
        if (!editor || !isReady || !containerRef.current) return;

        const container = containerRef.current;
        const ownerDoc = container.ownerDocument;
        const ownerWin = ownerDoc?.defaultView;

        // Only needed in popout windows
        if (!ownerWin || ownerWin === window) return;

        // --- Track actual DOM focus via focusin/focusout (works for both
        //     textarea and EditContext modes) ---
        let editorHasDomFocus = false;
        const handleFocusIn = () => {
            editorHasDomFocus = true;
        };
        const handleFocusOut = (e: FocusEvent) => {
            const related = e.relatedTarget instanceof Node ? e.relatedTarget : null;
            if (!container.contains(related)) {
                editorHasDomFocus = false;
            }
        };
        container.addEventListener("focusin", handleFocusIn);
        container.addEventListener("focusout", handleFocusOut);

        // --- Primary fix: patch hasFocus() on TextAreaWrapper to use the correct
        //     document for focus detection in popout windows. This lets the full
        //     focus state machine (refreshFocusState → _setHasFocus → fire events)
        //     run normally while providing correct focus detection. ---
        let cleanupPatch: (() => void) | null = null;
        try {
            const editCtx = editor._modelData?.view?._editContext;
            // TextAreaEditContext path: patch textAreaInput._textArea.hasFocus()
            const textAreaInput = editCtx?._textAreaInput;
            if (textAreaInput?.refreshFocusState) {
                const textAreaWrapper = textAreaInput._textArea;
                if (textAreaWrapper && typeof textAreaWrapper.hasFocus === "function") {
                    const origHasFocus = textAreaWrapper.hasFocus.bind(textAreaWrapper);
                    textAreaWrapper.hasFocus = () => {
                        if (ownerDoc.hasFocus()) {
                            const actual = textAreaWrapper._actual;
                            if (!actual?.isConnected) return false;
                            let activeEl: Element | null = ownerDoc.activeElement;
                            while (activeEl?.shadowRoot?.activeElement) {
                                activeEl = activeEl.shadowRoot.activeElement;
                            }
                            return activeEl === actual;
                        }
                        return origHasFocus();
                    };
                    cleanupPatch = () => {
                        textAreaWrapper.hasFocus = origHasFocus;
                    };
                }
            }
            // NativeEditContext path: patch _focusTracker.refreshFocusState()
            else if (editCtx?._focusTracker && typeof editCtx._focusTracker.refreshFocusState === "function") {
                const tracker = editCtx._focusTracker;
                const origRefresh = tracker.refreshFocusState.bind(tracker);
                tracker.refreshFocusState = () => {
                    if (ownerDoc.hasFocus()) {
                        const domNode = tracker._domNode;
                        let activeEl: Element | null = ownerDoc.activeElement;
                        while (activeEl?.shadowRoot?.activeElement) {
                            activeEl = activeEl.shadowRoot.activeElement;
                        }
                        tracker._handleFocusedChanged(domNode === activeEl);
                        return;
                    }
                    origRefresh();
                };
                cleanupPatch = () => {
                    tracker.refreshFocusState = origRefresh;
                };
            }
        } catch {
            /* structure differs — fall through to observer */
        }

        // --- Fallback: MutationObserver overrides cursor visibility:hidden ---
        const observer = new MutationObserver(mutations => {
            if (!editorHasDomFocus) return;
            for (const m of mutations) {
                const el = m.target as HTMLElement;
                if (el.classList?.contains("cursor") && el.style.visibility === "hidden") {
                    el.style.visibility = "inherit";
                }
            }
        });
        observer.observe(container, {
            attributes: true,
            subtree: true,
            attributeFilter: ["style"],
        });

        // Focus the editor initially + whenever popout window regains focus
        requestAnimationFrame(() => editor.focus());
        const handleWindowFocus = () => requestAnimationFrame(() => editor.focus());
        ownerWin.addEventListener("focus", handleWindowFocus);

        return () => {
            cleanupPatch?.();
            observer.disconnect();
            container.removeEventListener("focusin", handleFocusIn);
            container.removeEventListener("focusout", handleFocusOut);
            ownerWin.removeEventListener("focus", handleWindowFocus);
        };
    }, [disabled, editor, isReady]);

    const updateDecorations = useCallback(() => {
        if (!editor || !monaco) return;

        const model = editor.getModel();
        if (!isUsableModel(model)) return;

        const hoverLine = hoverLineRef.current;
        const breakpoints = selectedFile ? breakpointManager.get(selectedFile.id) : new Set();
        const decorationsArr: any[] = [];

        // Add breakpoint decorations (visual only - no code modification)
        breakpoints.forEach(line => {
            decorationsArr.push({
                range: new monaco.Range(line, 1, line, 1),
                options: {
                    isWholeLine: false,
                    glyphMarginClassName: "monaco-editor-breakpoint",
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                },
            });
        });

        // Add hover preview decoration
        if (hoverLine !== null && !breakpoints.has(hoverLine)) {
            decorationsArr.push({
                range: new monaco.Range(hoverLine, 1, hoverLine, 1),
                options: {
                    isWholeLine: false,
                    glyphMarginClassName: "monaco-editor-breakpoint-preview",
                },
            });
        }

        const newIds = model.deltaDecorations(decorationsRef.current, decorationsArr);
        decorationsRef.current = newIds;
    }, [editor, monaco, selectedFile?.id]);

    // Subscribe to breakpoint changes
    useEffect(() => {
        const selectedFileId = selectedFile?.id;
        const unsubscribe = breakpointManager.subscribe((fileId, breakpoints) => {
            if (fileId === selectedFileId) {
                setBreakpointsCount(breakpoints.size);
                updateDecorations();
            }
        });

        // Initialize count for current file
        const breakpointCount = selectedFileId ? breakpointManager.getCount(selectedFileId) : 0;
        setBreakpointsCount(breakpointCount);

        return () => unsubscribe();
    }, [selectedFile, setBreakpointsCount, updateDecorations]);

    const scrollToLine = useCallback(
        (lineNumber: number) => {
            if (!editor) return;

            requestAnimationFrame(() => {
                const model = editor.getModel();
                if (!isUsableModel(model)) return;

                const safeLine = Math.max(1, Math.min(lineNumber, model.getLineCount()));
                editor.setPosition({lineNumber: safeLine, column: 1});
                editor.revealLineInCenter(safeLine);
                editor.setSelection({
                    startLineNumber: safeLine,
                    startColumn: 1,
                    endLineNumber: safeLine,
                    endColumn: model.getLineMaxColumn(safeLine),
                });
                editor.focus();
            });
        },
        [editor],
    );

    // Setup editor event handlers
    useEffect(() => {
        if (!editor || !monaco || !isReady) return;

        // Clean up previous event handlers
        eventDisposablesRef.current.forEach(d => d.dispose?.());
        eventDisposablesRef.current = [];

        // Gutter click handler for breakpoints (visual only)
        const gutterClick = editor.onMouseDown((e: any) => {
            if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return;

            const clickedLine = e.target.position?.lineNumber;
            if (!clickedLine) return;

            // Toggle breakpoint (visual only - no code modification)
            if (selectedFile) {
                breakpointManager.toggle(selectedFile.id, clickedLine);
                updateDecorations();
            }
        });

        // Mouse move for hover preview
        const mouseMove = editor.onMouseMove((e: any) => {
            if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
                const line = e.target.position?.lineNumber ?? null;
                if (hoverLineRef.current !== line) {
                    hoverLineRef.current = line;
                    updateDecorations();
                }
            } else if (hoverLineRef.current !== null) {
                hoverLineRef.current = null;
                updateDecorations();
            }
        });

        // Mouse leave to clear hover
        const mouseLeave = editor.onMouseLeave(() => {
            if (hoverLineRef.current !== null) {
                hoverLineRef.current = null;
                updateDecorations();
            }
        });

        eventDisposablesRef.current.push(gutterClick, mouseMove, mouseLeave);

        return () => {
            eventDisposablesRef.current.forEach(d => d.dispose?.());
            eventDisposablesRef.current = [];
        };
    }, [editor, monaco, isReady, selectedFile, updateDecorations]);

    // Setup model and content change listener
    useEffect(() => {
        if (!monaco || !editor || !isReady || !selectedFile) return;

        const oldModel = editor.getModel();
        const newModel = getOrCreateModel(monaco, selectedFile.content, selectedFile.language, selectedFile.id);
        const modelChanged = oldModel !== newModel;

        if (modelChanged) {
            // Clear decorations before switching - the decoration IDs are model-specific
            decorationsRef.current = [];

            // Clear any pending validation markers before switching models
            if (isUsableModel(oldModel)) {
                try {
                    monaco.editor.setModelMarkers(oldModel, "customLinter", []);
                } catch {
                    // Model may already be disposed, ignore
                }
            }

            editor.setModel(newModel);
            // Enable glyph margin now that a real model is set — it's disabled
            // at creation to avoid _computeGlyphMarginLanes crash.
            editor.updateOptions({glyphMargin: true});
        }

        // Update content if model already existed but has stale content
        // (This handles switching back to a previously-viewed file)
        if (!modelChanged && isUsableModel(newModel) && newModel.getValue() !== selectedFile.content) {
            isProgrammaticChangeRef.current = true;
            applyServerContent(newModel, selectedFile.content);
            isProgrammaticChangeRef.current = false;
        }

        // Track that we've applied content for this file
        lastAppliedFileIdRef.current = selectedFile.id;
        appliedVersionRef.current.set(selectedFile.id, selectedFile.contentVersion ?? 0);

        // Configure JSON validation if available
        if (selectedFile.language === "json" && monaco.languages?.json?.jsonDefaults) {
            monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                validate: true,
                allowComments: true,
            });
        }

        // Setup custom validation for JavaScript
        let validationDisposable: DisposableType | null = null;
        if (selectedFile.language === "javascript") {
            validationDisposable = setupCustomValidation(monaco, newModel);
        }

        // Update decorations for new model
        requestAnimationFrame(() => {
            if (!editor.getModel()) return;
            updateDecorations();
        });

        // Setup content change listener (skip programmatic changes)
        const contentChange = newModel.onDidChangeContent(() => {
            if (isProgrammaticChangeRef.current) return;
            onFileContentChange(selectedFile.id, newModel.getValue());
        });

        // Scroll to line if pending
        let timeoutId: NodeJS.Timeout | null = null;
        if (pendingLineNumber && pendingLineNumber > 0) {
            timeoutId = setTimeout(() => {
                scrollToLine(pendingLineNumber);
                setPendingLineNumber(undefined);
            }, 200);
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            contentChange.dispose();
            validationDisposable?.dispose?.();
        };
    }, [
        monaco,
        editor,
        isReady,
        selectedFile?.id,
        selectedFile?.language,
        pendingLineNumber,
        onFileContentChange,
        scrollToLine,
        setPendingLineNumber,
        updateDecorations,
    ]);

    // Live @import resolution check — runs on every content change for JS
    // files so the user gets immediate feedback when an import specifier
    // doesn't match any Import asset in the scene. The heavier full
    // validation still runs only when the user presses Validate.
    useEffect(() => {
        if (!monaco || !editor || !isReady || !selectedFile) return;
        if (selectedFile.language !== "javascript") return;

        const model = editor.getModel();
        if (!isUsableModel(model)) return;

        const runImportValidation = () => {
            if (!isUsableModel(model)) return;
            const markers = availableImportSpecifiers
                ? validateImportResolution(model.getValue(), availableImportSpecifiers)
                : [];
            const monacoMarkers = markers.map(m => ({
                severity: monaco.MarkerSeverity[m.severity],
                startLineNumber: m.startLineNumber,
                startColumn: m.startColumn,
                endLineNumber: m.endLineNumber,
                endColumn: m.endColumn,
                message: m.message,
            }));
            monaco.editor.setModelMarkers(model, "importValidator", monacoMarkers);
        };

        runImportValidation();
        const disposable = model.onDidChangeContent(runImportValidation);
        return () => {
            disposable.dispose?.();
            if (isUsableModel(model)) {
                try {
                    monaco.editor.setModelMarkers(model, "importValidator", []);
                } catch {
                    // Model may already be disposed, ignore
                }
            }
        };
    }, [monaco, editor, isReady, selectedFile?.id, selectedFile?.language, availableImportSpecifiers]);

    // Apply content when contentVersion increases (external update like AI edit or revert).
    // File switches are handled by the setup effect above.
    useEffect(() => {
        if (!editor || !isReady || !selectedFile) return;

        // Skip if this is a file switch (setup effect handles that)
        if (lastAppliedFileIdRef.current !== selectedFile.id) return;

        const model = editor.getModel();
        if (!isUsableModel(model)) return;

        const currentVersion = selectedFile.contentVersion ?? 0;
        const appliedVersion = appliedVersionRef.current.get(selectedFile.id) ?? -1;

        // Only apply content if version increased (external update)
        if (currentVersion <= appliedVersion) return;

        // Skip if model already has this content
        if (model.getValue() === selectedFile.content) {
            appliedVersionRef.current.set(selectedFile.id, currentVersion);
            return;
        }

        // Apply the external update
        isProgrammaticChangeRef.current = true;
        applyServerContent(model, selectedFile.content);
        isProgrammaticChangeRef.current = false;

        appliedVersionRef.current.set(selectedFile.id, currentVersion);
    }, [editor, isReady, selectedFile?.id, selectedFile?.contentVersion, selectedFile?.content]);

    // Update read-only state when selected file changes
    useEffect(() => {
        if (!editor || !isReady) return;

        editor.updateOptions({readOnly: selectedFile?.isReadOnly ?? false});
    }, [editor, isReady, selectedFile?.isReadOnly]);

    // Handle resize events
    useEffect(() => {
        const handleResize = (data: {width?: number}) => {
            requestAnimationFrame(() => {
                if (editor && containerRef.current) {
                    editor.layout({
                        width: data.width || containerRef.current.clientWidth,
                        height: containerRef.current.clientHeight,
                    });
                    updateDecorations();
                }
            });
        };

        global.app?.on("resizeCodeEditor.CodeEditor", handleResize);

        return () => {
            global.app?.on("resizeCodeEditor.CodeEditor", null);
        };
    }, [editor, updateDecorations]);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            eventDisposablesRef.current.forEach(d => d.dispose?.());
            decorationsRef.current = [];
            hoverLineRef.current = null;
            setValidationResults(new Map());
            setShowValidationPanel(false);
        };
    }, []);

    // Apply theme changes at runtime
    useEffect(() => {
        if (!monaco || !isReady) return;
        void applyEditorTheme(monaco, editorTheme);
    }, [monaco, isReady, editorTheme]);

    // Register IntelliJ/WebStorm keybindings
    useEffect(() => {
        if (!monaco || !editor || !isReady) return;
        const disposables = registerIntellijKeybindings(monaco, editor);
        return () => disposables.forEach(d => d.dispose());
    }, [monaco, editor, isReady]);

    // Register autocomplete provider for lambda scripts
    useEffect(() => {
        if (!monaco || !isReady) return;
        const disposable = registerScriptCompletions(monaco, "behavior");
        return () => disposable.dispose();
    }, [monaco, isReady]);

    const handleThemeChange = useCallback(
        (e: ChangeEvent<HTMLSelectElement>) => {
            const newTheme = e.target.value;
            setEditorTheme(newTheme);
            localStorage.setItem("codeEditorTheme", newTheme);
            requestAnimationFrame(() => editor.focus());
        },
        [editor],
    );

    const handleFontSizeChange = useCallback(
        (e: ChangeEvent<HTMLSelectElement>) => {
            const newSize = parseInt(e.target.value, 10);
            setFontSize(newSize);
            localStorage.setItem("codeEditorFontSize", String(newSize));
            editor?.updateOptions({fontSize: newSize});
            requestAnimationFrame(() => editor?.focus());
        },
        [editor],
    );

    const handleFontFamilyChange = useCallback(
        (e: ChangeEvent<HTMLSelectElement>) => {
            const newFamily = e.target.value;
            setFontFamily(newFamily);
            localStorage.setItem("codeEditorFontFamily", newFamily);
            editor?.updateOptions({fontFamily: newFamily || undefined});
            requestAnimationFrame(() => editor?.focus());
        },
        [editor],
    );

    const handleFormat = useCallback(() => {
        if (!editor) return;
        const action = editor.getAction("editor.action.formatDocument");
        if (action) {
            action.run();
        }
        requestAnimationFrame(() => editor.focus());
    }, [editor]);

    const handleValidate = useCallback(() => {
        if (!editor || !monaco || !selectedFile) return;
        const model = editor.getModel();
        if (!isUsableModel(model)) return;
        const code = model.getValue();

        // Run both the lightweight structural validation and the full importer suite
        const structureMarkers = validateScript(code, scriptType, {availableImportSpecifiers});
        const importerMarkers = runImporterValidation(code, scriptType);
        const allMarkers = [...structureMarkers, ...importerMarkers];

        const monacoMarkers = allMarkers.map(m => ({
            severity: monaco.MarkerSeverity[m.severity],
            startLineNumber: m.startLineNumber,
            startColumn: m.startColumn,
            endLineNumber: m.endLineNumber,
            endColumn: m.endColumn,
            message: m.message,
        }));
        monaco.editor.setModelMarkers(model, "structureValidator", monacoMarkers);

        // Log validation outcome for debugging
        if (allMarkers.length === 0) {
            console.debug("[Validation] Completed successfully — no issues found.");
        } else {
            console.debug(`[Validation] Completed with ${allMarkers.length} issue(s):`, allMarkers);
        }

        // Store results for the panel and show it
        setValidationResults(prev => new Map(prev).set(selectedFile.id, allMarkers));
        setShowValidationPanel(true);

        requestAnimationFrame(() => editor.focus());
    }, [editor, monaco, scriptType, selectedFile, availableImportSpecifiers]);

    const handleNavigateToMarker = useCallback((line: number, col: number) => {
        if (!editor) return;
        editor.revealLineInCenter(line);
        editor.setPosition({lineNumber: line, column: col});
        editor.focus();
    }, [editor]);

    // Show/hide validation panel when switching files based on stored results
    useEffect(() => {
        if (!selectedId) return;
        const hasResults = validationResults.has(selectedId) && (validationResults.get(selectedId)?.length ?? 0) > 0;
        setShowValidationPanel(hasResults);
    }, [selectedId, validationResults]);

    return (
        <Container style={disabled ? {display: "none"} : {}}>
            <div style={{display: "flex", borderBottom: "1px solid #444"}}>
                {files.map(file => (
                    <Tab
                        key={file.id}
                        $active={file.id === selectedFile?.id}
                        onClick={() => setSelectedId(file.id)}
                    >
                        <FileIcon extension={file.name.split(".").pop()?.toLowerCase() || ""} />
                        <TabText>{file.name}</TabText>
                    </Tab>
                ))}
            </div>
            {showToolbar && (
                <Toolbar>
                    {isToolbarOverflowing && (
                        <ToolbarScrollButton
                            onClick={() => handleToolbarScroll("left")}
                            disabled={!canScrollToolbarLeft}
                            aria-label="Scroll toolbar left"
                            title="Scroll left"
                        >
                            {"<"}
                        </ToolbarScrollButton>
                    )}
                    <ToolbarScrollViewport ref={toolbarViewportRef}>
                        <ToolbarScrollContent>
                            <ThemeSelect
                                value={editorTheme}
                                onChange={handleThemeChange}
                            >
                                <optgroup label="Dark">
                                    {darkThemes.map(t => (
                                        <option
                                            key={t.id}
                                            value={t.id}
                                        >
                                            {t.label}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Light">
                                    {lightThemes.map(t => (
                                        <option
                                            key={t.id}
                                            value={t.id}
                                        >
                                            {t.label}
                                        </option>
                                    ))}
                                </optgroup>
                            </ThemeSelect>
                            <FontSelect
                                value={fontFamily}
                                onChange={handleFontFamilyChange}
                                title="Font Family"
                            >
                                <option value="">System Default</option>
                                <option value="'Fira Code', monospace">Fira Code</option>
                                <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                                <option value="'Source Code Pro', monospace">Source Code Pro</option>
                            </FontSelect>
                            <FontSelect
                                value={String(fontSize)}
                                onChange={handleFontSizeChange}
                                title="Font Size"
                            >
                                {[10, 11, 12, 13, 14, 15, 16, 18, 20, 24].map(s => (
                                    <option key={s} value={String(s)}>{s}px</option>
                                ))}
                            </FontSelect>
                            <FormatBtn
                                ref={keybindingsBtnRef}
                                onClick={() => setShowKeybindings(v => !v)}
                                onMouseDown={e => e.preventDefault()}
                            >
                                <HiOutlineInformationCircle
                                    width={14}
                                    height={14}
                                />
                            </FormatBtn>
                            {showKeybindings && (
                                <KeybindingsPanel
                                    anchorRef={keybindingsBtnRef}
                                    onClose={() => {
                                        setShowKeybindings(false);
                                        requestAnimationFrame(() => editor.focus());
                                    }}
                                />
                            )}
                            <FormatBtn
                                onClick={handleValidate}
                                title="Validate structure"
                            >
                                <HiOutlineCheckCircle
                                    width={14}
                                    height={14}
                                />
                                Validate
                            </FormatBtn>
                            <FormatBtn
                                onClick={handleFormat}
                                title={`Format Document (${isMac ? "⇧⌥F" : "Shift+Alt+F"})`}
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                >
                                    <path
                                        d="M3.707 1.815C3.45 1.931 3.282 2.167 3.26 2.442 3.235 2.75 3.376 3.005 3.657 3.161L3.8 3.24H6 8.2L8.337 3.168C8.614 3.022 8.765 2.75 8.74 2.442 8.718 2.167 8.55 1.931 8.293 1.815 8.176 1.762 8.128 1.761 6 1.761 3.872 1.761 3.824 1.762 3.707 1.815M10.74 1.798C10.429 1.909 10.208 2.274 10.257 2.595 10.3 2.873 10.52 3.136 10.775 3.211 10.965 3.268 11.538 3.269 11.726 3.213 11.907 3.159 12.108 2.978 12.186 2.796 12.259 2.625 12.254 2.34 12.173 2.173 12.099 2.021 11.915 1.852 11.769 1.803 11.607 1.747 10.891 1.744 10.74 1.798M3.707 5.309C3.11 5.578 3.102 6.402 3.693 6.683 3.826 6.746 3.834 6.746 4.749 6.746L5.671 6.747 5.835 6.665C6.106 6.53 6.247 6.302 6.247 6 6.247 5.698 6.106 5.47 5.835 5.335L5.671 5.253 4.749 5.254C3.88 5.254 3.82 5.258 3.707 5.309M8.293 5.278C7.978 5.374 7.761 5.668 7.761 6 7.761 6.395 8.05 6.709 8.442 6.74 8.751 6.765 9.006 6.624 9.16 6.343 9.227 6.221 9.238 6.171 9.238 6 9.238 5.829 9.227 5.779 9.16 5.657 9.065 5.483 8.915 5.35 8.752 5.295 8.625 5.251 8.407 5.244 8.293 5.278M11.237 5.296C11.083 5.351 10.917 5.502 10.833 5.663 10.774 5.776 10.761 5.835 10.761 6 10.761 6.242 10.841 6.42 11.016 6.569 11.224 6.748 11.243 6.75 12.55 6.741L13.723 6.732 13.827 6.676C14.085 6.536 14.239 6.284 14.239 6 14.239 5.716 14.085 5.464 13.827 5.324 13.722 5.268 13.695 5.267 12.533 5.262 11.544 5.257 11.328 5.263 11.237 5.296M3.779 8.785C3.426 8.911 3.228 9.211 3.26 9.569 3.278 9.763 3.349 9.905 3.499 10.044 3.706 10.235 3.761 10.245 4.548 10.235L5.24 10.227 5.364 10.154C5.7 9.956 5.841 9.532 5.681 9.195 5.597 9.017 5.399 8.84 5.225 8.789 5.036 8.732 3.934 8.73 3.779 8.785M7.779 8.785C7.426 8.911 7.228 9.211 7.26 9.569 7.284 9.836 7.454 10.071 7.707 10.185 7.824 10.237 7.874 10.239 9.735 10.239 11.881 10.24 11.799 10.247 12.007 10.044 12.163 9.893 12.222 9.758 12.235 9.531 12.249 9.283 12.178 9.112 11.994 8.946 11.765 8.74 11.835 8.747 9.735 8.748 8.245 8.749 7.86 8.756 7.779 8.785M3.808 12.277C3.12 12.466 3.065 13.402 3.724 13.7 3.817 13.742 3.956 13.747 5.253 13.747H6.68L6.805 13.684C7.062 13.557 7.253 13.265 7.253 13 7.253 12.735 7.062 12.443 6.805 12.316L6.68 12.253 5.307 12.248C4.252 12.244 3.904 12.25 3.808 12.277"
                                        stroke="none"
                                        fill="currentColor"
                                        fillRule="evenodd"
                                    />
                                </svg>
                                Format
                            </FormatBtn>
                            {onExport && (
                                <Tooltip
                                    text={exportDisabled && exportDisabledReason ? exportDisabledReason : "Export"}
                                    height="auto"
                                >
                                    <FormatBtn
                                        onClick={onExport}
                                        disabled={exportDisabled}
                                    >
                                        <HiOutlineArrowDownTray
                                            width={14}
                                            height={14}
                                        />
                                        Export
                                    </FormatBtn>
                                </Tooltip>
                            )}
                        </ToolbarScrollContent>
                    </ToolbarScrollViewport>
                    {isToolbarOverflowing && (
                        <ToolbarScrollButton
                            onClick={() => handleToolbarScroll("right")}
                            disabled={!canScrollToolbarRight}
                            aria-label="Scroll toolbar right"
                            title="Scroll right"
                        >
                            {">"}
                        </ToolbarScrollButton>
                    )}
                </Toolbar>
            )}
            {breakpointsCount > 0 && (
                <DebuggerBanner>
                    Debug mode: {breakpointsCount} breakpoint{breakpointsCount > 1 ? "s" : ""} will pause execution when
                    dev-tools are open
                </DebuggerBanner>
            )}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    minHeight: 0,
                    width: "100%",
                }}
            />
            {showValidationPanel && currentFileMarkers.length > 0 && (
                <ValidationResultsPanel
                    markers={currentFileMarkers}
                    onNavigate={handleNavigateToMarker}
                    onClose={() => setShowValidationPanel(false)}
                />
            )}
        </Container>
    );
};

export default BehaviorEditor;
