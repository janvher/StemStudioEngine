/**
 * CodeEditor — single shell for editing behaviors, lambdas, and
 * viewing file assets in one modal. Replaces the separate BehaviorCreator,
 * LambdaEditor, and FileViewerModal entry points.
 *
 * Delegates:
 *  - Left panel: AssetTree (folder-tree with search)
 *  - Center: <BehaviorEditor> via useMonacoHost
 *  - Right panel: BehaviorPanel | LambdaPanel | FilePanel
 *  - State: useCodeEditorState (cross-kind dirty map)
 *  - Data: useBehaviorData, useLambdaData, useGetAssetRevisionData
 *  - Save: useBehaviorSave, useLambdaSave
 */
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {HiOutlineArrowDownOnSquare, HiOutlineArrowTopRightOnSquare, HiOutlineXMark} from "react-icons/hi2";
import {TbDeviceFloppy, TbFiles, TbLayoutSidebarLeftExpand, TbLayoutSidebarRightExpand} from "react-icons/tb";

import {AssetTree} from "./AssetTree";
import {
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ButtonsWrapper,
    HeaderIconBtn,
    HeaderTextBtn,
    BodyWrapper,
    EditorSurface,
    LeftPanel,
} from "./CodeEditor.style";
import type {AssetTreeEntry} from "./hooks/useAssetTree";
import {useAssetTree} from "./hooks/useAssetTree";
import {useCodeEditorState} from "./hooks/useCodeEditorState";
import type {InitialDrafts} from "./hooks/useCodeEditorState";
import {useGlobalSearch} from "./hooks/useGlobalSearch";
import {useMonacoHost, parseMonacoFileId} from "./hooks/useMonacoHost";
import type {MonacoHostDraft} from "./hooks/useMonacoHost";
import {BehaviorPanel} from "./kinds/BehaviorPanel";
import {FilePanel} from "./kinds/FilePanel";
import {LambdaPanel} from "./kinds/LambdaPanel";
import {ScriptPanel} from "./kinds/ScriptPanel";
import {QuickOpenPalette} from "./QuickOpenPalette";
import {SearchResultsPanel} from "./SearchResultsPanel/SearchResultsPanel";
import type {AssetKind, SortMode, CodeEditorProps} from "./types";
import {AssetType} from "@stem/network/api/asset";
import {createSceneAssetWithData} from "@stem/network/api/scene/v2";
import {useAppGlobalContext, useAuthorizationContext} from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import {queryClient as defaultQueryClient} from "@web-shared/queryClient";
import {showToast} from "@stem/editor-oss/showToast";
import {ElementsUtils} from "@stem/editor-oss/utils/ElementsUtils";
import {useGetAssetRevisionData, assetKeys, createAssetRevision,useUpdateAsset} from "../../../../asset-management/hooks/assets";
import {BehaviorConfig} from "../../../../behaviors/BehaviorConfig";
import {useBehaviorData, useGetBehaviorRevisionData} from "../../../../behaviors/hooks/behaviors";
import {useApplySceneBehaviorRevision} from "../../../../behaviors/hooks/useApplySceneBehaviorRevision";
import {createBehavior} from "../../../../behaviors/util";
import {useLambdaData,useCreateLambda} from "../../../../lambdas/hooks/lambdas";
import {useApplySceneLambdaRevision} from "../../../../lambdas/hooks/useApplySceneLambdaRevision";
import {
    useScriptData,
    useCreateScript,
    useCreateScriptRevision,
    useGetScriptRevisionData,
} from "../../../../scripts/hooks/scripts";
import {useApplySceneScriptRevision} from "../../../../scripts/hooks/useApplySceneScriptRevision";
import {useImportFromFile} from "../../../../scripts/hooks/useImportFromFile";
import {updateSceneScriptRevision} from "../../../../scripts/util";
import BehaviorEditor from "../../BehaviorEditor";
import {Loading} from "../../BehaviorEditor/Loading";
import {isEventInsideMonaco, shouldGuardEditorShortcut} from "../../BehaviorEditor/shortcutGuards";
import {getEditorThemeColors} from "../../BehaviorEditor/workspace";
import {AddImportMenu} from "../../common/AddImportMenu/AddImportMenu";
import {ImportPacksPicker} from "../../common/AddImportMenu/ImportPacksPicker";
import {DetailsPopup as CreateLambdaMetadataPopup} from "../../common/DetailsPopup/DetailsPopup";
import {isDesktopDevice} from "../../common/hooks/usePopoutWindow";
import {Tooltip} from "../../common/Tooltip";
import {selectFile} from "../../LeftPanel/MainTabs/AssetsTab/AssetsRows/helpers";
import {NewBehaviorPopup as CreateBehaviorMetadataPopup} from "../BehaviorCreator/BehaviorChangesPopup/NewBehaviorPopup";
import {
    useBehaviorSave,
    type MergeRequest,
    type MergeResult,
    type SaveCompleteInfo,
} from "../BehaviorCreator/hooks";
import {ResizableFileTree} from "../BehaviorCreator/ResizableFileTree/ResizableFileTree";
import {ResizableSettingsPanel} from "../BehaviorCreator/ResizableSettingsPanel/ResizableSettingsPanel";
import {ScriptTemplate} from "../BehaviorCreator/ScriptTemplate";
import {TextMergeModal} from "../BehaviorCreator/TextMergeModal/TextMergeModal";
import {DEFAULT_BEHAVIOR_CONFIG, type INewBehaviorData} from "../BehaviorCreator/types";
import {useLambdaSave} from "../LambdaCreator/hooks/useLambdaSave";
import {LAMBDA_SCRIPT_TEMPLATE} from "../LambdaCreator/LambdaScriptTemplate";

// ---------------------------------------------------------------------------
// Merge modal state
// ---------------------------------------------------------------------------

type MergeModalState = {
    isOpen: boolean;
    baseText: string;
    localText: string;
    latestText: string;
    resolve: ((result: MergeResult) => void) | null;
};

const INITIAL_MERGE: MergeModalState = {
    isOpen: false,
    baseText: "",
    localText: "",
    latestText: "",
    resolve: null,
};

// ---------------------------------------------------------------------------
// Props for the scene-level wrapper
// ---------------------------------------------------------------------------

export interface CodeEditorShellProps extends CodeEditorProps {
    sceneId: string;
    initialDrafts?: InitialDrafts;
    onSaveComplete?: (info: SaveCompleteInfo) => void;
    onSaveAllComplete?: (infos: SaveCompleteInfo[]) => void;
    onCreateKindConsumed?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CodeEditor: React.FC<CodeEditorShellProps> = ({
    sceneId,
    initialSelection,
    initialDrafts,
    onClose,
    onPopOut,
    onPin,
    isPinned,
    onDirtyChange,
    onSaveComplete,
    onSaveAllComplete,
    onCreateKindConsumed,
    onRestoreInline,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const {dbUser} = useAuthorizationContext();
    const {advancedMode} = useAppGlobalContext();

    // Right-side details panel (behavior/lambda/import metadata) — hidden by
    // default in AI-focused mode so the editor gets the full pinned width;
    // the user can re-open it via the header toggle. Seeded from advancedMode
    // on mount and not re-synced afterward, so toggling Advanced Mode while
    // the editor is open doesn't yank the panel under the user's hand.
    const [showDetailsPanel, setShowDetailsPanel] = useState<boolean>(advancedMode);

    // --- Sort/filter mode (resets to "name" each time the editor opens) ----
    const [sortMode, setSortMode] = useState<SortMode>("name");
    const handleSortModeChange = useCallback((mode: SortMode) => {
        setSortMode(mode);
    }, []);

    // --- Asset tree (left panel) -------------------------------------------
    const [search, setSearch] = useState("");
    // Note: useAssetTree is called below after changedIds is computed.

    // --- Global search (cross-file content search) -------------------------
    const [showSearchPanel, setShowSearchPanel] = useState(false);

    // --- Cross-kind state ---------------------------------------------------
    const editorState = useCodeEditorState({initialSelection, initialDrafts});
    const {
        activeEntry,
        setActiveEntry,
        modifiedBehaviors,
        updateBehavior,
        clearBehaviorChanges,
        getModifiedBehavior,
        modifiedLambdas,
        updateLambda,
        clearLambdaChanges,
        getModifiedLambda,
        modifiedScripts,
        updateScript,
        clearScriptChanges,
        getModifiedScript,
        modifiedFiles,
        updateFile,
        clearFileChanges,
        getModifiedFile,
        hasChanges,
        hasAnyChanges,
    } = editorState;

    // Build set of dirty entry keys for the "changed" filter mode.
    const changedIds = useMemo(() => {
        const ids = new Set<string>();
        for (const id of Object.keys(modifiedBehaviors)) {
            ids.add(`behavior:${id}`);
        }
        for (const id of Object.keys(modifiedLambdas)) {
            ids.add(`lambda:${id}`);
        }
        for (const id of Object.keys(modifiedScripts)) {
            ids.add(`script:${id}`);
        }
        for (const id of Object.keys(modifiedFiles)) {
            ids.add(`file:${id}`);
        }
        return ids;
    }, [modifiedBehaviors, modifiedLambdas, modifiedScripts, modifiedFiles]);

    const {folders, isLoading: isTreeLoading, totalCount, findEntry} = useAssetTree({
        sceneId,
        search,
        currentUserId: dbUser?.id,
        sortMode,
        changedIds,
    });

    const globalSearch = useGlobalSearch({folders});

    // Resolve initial selection once tree data loads.
    useEffect(() => {
        if (!initialSelection || !activeEntry) return;
        if (activeEntry.name !== "") return; // already resolved
        const resolved = findEntry(initialSelection.kind, initialSelection.id);
        if (resolved) {
            setActiveEntry(resolved);
        }
    }, [initialSelection, activeEntry, findEntry, setActiveEntry]);

    // Auto-select the first behavior when opened with no real selection
    // (no initialSelection, or a creation-only trigger with empty id).
    useEffect(() => {
        if (initialSelection && initialSelection.id) return; // real selection takes priority
        if (activeEntry) return; // already selected something
        if (isTreeLoading) return; // wait for data
            const first = folders.behaviors[0] ?? folders.lambdas[0] ?? folders.scripts[0] ?? folders.files[0];
            if (first) {
                setActiveEntry(first);
            }
    }, [initialSelection, activeEntry, isTreeLoading, folders.behaviors, folders.files, folders.scripts, folders.lambdas, setActiveEntry]);

    // --- Copilot edit locking ------------------------------------------------
    // Track which asset IDs the AI copilot is currently editing so we can
    // force them to readonly in the Monaco editor.
    const [copilotLockedIds, setCopilotLockedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const app = global.app;
        if (!app) return;

        app.on("copilotEditStart.CodeEditor", ({assetId}: {assetId: string}) => {
            setCopilotLockedIds(prev => {
                const next = new Set(prev);
                next.add(assetId);
                return next;
            });
        });

        app.on("copilotEditEnd.CodeEditor", ({assetId}: {assetId: string}) => {
            setCopilotLockedIds(prev => {
                const next = new Set(prev);
                next.delete(assetId);
                return next;
            });
        });

        return () => {
            app.on("copilotEditStart.CodeEditor", null);
            app.on("copilotEditEnd.CodeEditor", null);
        };
    }, []);

    const isCopilotLocked = !!(activeEntry && copilotLockedIds.has(activeEntry.id));

    // --- Real-time asset sync via assetChanged event -----------------------
    // When the AI copilot or multiplayer creates/edits/deletes an asset,
    // invalidate React Query so the tree and editor pick up changes.
    useEffect(() => {
        const app = global.app;
        if (!app) return;

        app.on("assetChanged.CodeEditor", ({assetId}: {assetId: string}) => {
            // Invalidate the scene asset list so useAssetTree picks up new/removed entries
            void defaultQueryClient.invalidateQueries({queryKey: assetKeys.sceneLists(sceneId)});

            // If the changed asset is the one currently open, also refetch its data
            if (activeEntry && assetId === activeEntry.id) {
                void defaultQueryClient.invalidateQueries({queryKey: assetKeys.allRevisions(assetId)});
                void defaultQueryClient.invalidateQueries({queryKey: assetKeys.detail(assetId)});
            }
        });

        return () => {
            app.on("assetChanged.CodeEditor", null);
        };
    }, [sceneId, activeEntry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Guard against externally deleted assets — if the active entry is no
    // longer in the tree after a refetch, fall back to the first available.
    // Skip when search or "changed" filter is active — the entry still
    // exists, it's just not visible in the filtered list.
    useEffect(() => {
        if (!activeEntry || isTreeLoading) return;
        if (search || sortMode === "changed") return;
        const stillExists = findEntry(activeEntry.kind, activeEntry.id);
        if (!stillExists) {
            const first = folders.behaviors[0] ?? folders.lambdas[0] ?? folders.scripts[0] ?? folders.files[0];
            if (first) setActiveEntry(first);
            else setActiveEntry(null);
        }
    }, [activeEntry, findEntry, isTreeLoading, folders, setActiveEntry, search, sortMode]);

    // Notify parent of dirty state changes.
    useEffect(() => {
        onDirtyChange?.(hasAnyChanges);
    }, [hasAnyChanges, onDirtyChange]);

    // --- Behavior data fetching --------------------------------------------
    const behaviorModified = activeEntry?.kind === "behavior" ? getModifiedBehavior(activeEntry.id) : undefined;
    const behaviorRevisionId =
        behaviorModified?.baseRevisionId ??
        (activeEntry?.kind === "behavior" ? (findEntry("behavior", activeEntry.id))?.headRevisionId : undefined);

    const {
        config: behaviorOriginalConfig,
        code: behaviorOriginalCode,
        isLoading: isBehaviorLoading,
    } = useBehaviorData(
        activeEntry?.kind === "behavior" ? activeEntry.id : "invalid",
        {enabled: activeEntry?.kind === "behavior", revisionId: behaviorRevisionId},
    );

    // --- Lambda data fetching ----------------------------------------------
    const lambdaModified = activeEntry?.kind === "lambda" ? getModifiedLambda(activeEntry.id) : undefined;
    const lambdaRevisionId =
        lambdaModified?.baseRevisionId ??
        (activeEntry?.kind === "lambda" ? (findEntry("lambda", activeEntry.id))?.headRevisionId : undefined);

    const {
        config: lambdaOriginalConfig,
        code: lambdaOriginalCode,
        isLoading: isLambdaLoading,
    } = useLambdaData(
        activeEntry?.kind === "lambda" ? activeEntry.id : "invalid",
        lambdaRevisionId,
    );

    // --- Import data fetching ----------------------------------------------
    const scriptModified = activeEntry?.kind === "script" ? getModifiedScript(activeEntry.id) : undefined;
    const importRevisionId =
        scriptModified?.baseRevisionId ??
        (activeEntry?.kind === "script" ? (findEntry("script", activeEntry.id))?.headRevisionId : undefined);

    const {
        code: scriptOriginalCode,
        isLoading: isScriptLoading,
    } = useScriptData(
        activeEntry?.kind === "script" ? activeEntry.id : "invalid",
        importRevisionId,
    );

    // --- File data fetching ------------------------------------------------
    const getRevisionData = useGetAssetRevisionData();
    const [fileText, setFileText] = useState<string>("");
    const [isFileLoading, setIsFileLoading] = useState(false);
    const fileEntryRef = useRef<string | null>(null);

    useEffect(() => {
        if (activeEntry?.kind !== "file") {
            setFileText("");
            fileEntryRef.current = null;
            return;
        }
        const treeEntry = findEntry("file", activeEntry.id);
        if (!treeEntry?.headRevisionId) return;
        const key = `${treeEntry.id}:${treeEntry.headRevisionId}`;
        if (fileEntryRef.current === key) return;
        fileEntryRef.current = key;

        setIsFileLoading(true);
        getRevisionData(treeEntry.id, treeEntry.headRevisionId, "text")
            .then((data: any) => {
                // getAssetRevisionData returns the raw text when responseType is "text"
                setFileText(typeof data === "string" ? data : data?.code ?? "");
            })
            .catch(() => setFileText(""))
            .finally(() => setIsFileLoading(false));
    }, [activeEntry, findEntry, getRevisionData]);

    // --- Monaco host adapter -----------------------------------------------
    const draft = useMemo<MonacoHostDraft>(() => {
        if (!activeEntry) return {};

        if (activeEntry.kind === "behavior") {
            const mod = getModifiedBehavior(activeEntry.id);
            const code = mod?.code ?? behaviorOriginalCode ?? "";
            const config = mod?.config ?? behaviorOriginalConfig;
            return {
                behavior: {
                    code,
                    configJson: config ? JSON.stringify(config, null, 2) : "{}",
                },
            };
        }

        if (activeEntry.kind === "lambda") {
            const mod = getModifiedLambda(activeEntry.id);
            const code = mod?.code ?? lambdaOriginalCode ?? "";
            return {lambda: {code}};
        }

        if (activeEntry.kind === "script") {
            const mod = getModifiedScript(activeEntry.id);
            const code = mod?.code ?? scriptOriginalCode ?? "";
            return {script: {code}};
        }

        if (activeEntry.kind === "file") {
            const mod = getModifiedFile(activeEntry.id);
            const ext = activeEntry.name.split(".").pop()?.toLowerCase() ?? "";
            const langMap: Record<string, string> = {
                js: "javascript", mjs: "javascript", cjs: "javascript",
                ts: "typescript", tsx: "typescript", jsx: "javascript",
                json: "json", html: "html", css: "css", md: "markdown",
                yaml: "yaml", yml: "yaml", xml: "xml", svg: "xml",
                py: "python", go: "go", rs: "rust", java: "java",
                glsl: "glsl", vert: "glsl", frag: "glsl",
                sh: "shell", bash: "shell",
            };
            return {file: {text: mod?.text ?? fileText, language: langMap[ext] ?? "plaintext"}};
        }

        return {};
    }, [
        activeEntry,
        getModifiedBehavior,
        getModifiedScript,
        getModifiedLambda,
        getModifiedFile,
        behaviorOriginalCode,
        behaviorOriginalConfig,
        scriptOriginalCode,
        lambdaOriginalCode,
        fileText,
        findEntry,
    ]);

    const isContentLoading =
        (activeEntry?.kind === "behavior" && isBehaviorLoading) ||
        (activeEntry?.kind === "script" && isScriptLoading) ||
        (activeEntry?.kind === "lambda" && isLambdaLoading) ||
        (activeEntry?.kind === "file" && isFileLoading);

    const {files: monacoFiles, initialSelectedId, scriptType} = useMonacoHost({
        entry: activeEntry,
        draft,
        isLoading: isContentLoading,
        forcedReadOnly: isCopilotLocked,
    });

    // --- Merge modal -------------------------------------------------------
    const [mergeModal, setMergeModal] = useState<MergeModalState>(INITIAL_MERGE);

    const handleMergeRequired = useCallback((req: MergeRequest): Promise<MergeResult> => {
        return new Promise(resolve => {
            setMergeModal({isOpen: true, baseText: req.baseText, localText: req.localText, latestText: req.latestText, resolve});
        });
    }, []);

    const handleBehaviorMergeComplete = useCallback(
        ({behaviorId, mergedCode, mergedConfig, mergeRevisionId}: {
            behaviorId: string;
            mergedCode: string;
            mergedConfig: BehaviorConfig;
            mergeRevisionId: string;
        }) => {
            updateBehavior(behaviorId, {code: mergedCode, config: mergedConfig}, mergeRevisionId, {forceBaseRevisionId: true});
        },
        [updateBehavior],
    );

    const syncSavedBehaviorDraft = useCallback(
        ({assetId, revisionId, code, config}: SaveCompleteInfo) => {
            const existing = getModifiedBehavior(assetId);
            updateBehavior(
                assetId,
                {},
                revisionId,
                {
                    forceBaseRevisionId: true,
                    originals: {
                        code,
                        config,
                        name: existing?.name ?? existing?.originalName,
                        description: existing?.description ?? existing?.originalDescription,
                        tags: existing?.tags ?? existing?.originalTags,
                    },
                },
            );
        },
        [getModifiedBehavior, updateBehavior],
    );

    const handleBehaviorSaveComplete = useCallback(
        (info: SaveCompleteInfo) => {
            onSaveComplete?.(info);
            syncSavedBehaviorDraft(info);
        },
        [onSaveComplete, syncSavedBehaviorDraft],
    );

    const handleBehaviorSaveAllComplete = useCallback(
        (infos: SaveCompleteInfo[]) => {
            onSaveAllComplete?.(infos);
            for (const info of infos) {
                syncSavedBehaviorDraft(info);
            }
        },
        [onSaveAllComplete, syncSavedBehaviorDraft],
    );

    // --- Save hooks --------------------------------------------------------
    const {save: saveBehavior, saveAll: saveAllBehaviors, isSaving: isSavingBehavior} = useBehaviorSave({
        onMergeRequired: handleMergeRequired,
        onMergeComplete: handleBehaviorMergeComplete,
        onSaveComplete: handleBehaviorSaveComplete,
        onSaveAllComplete: handleBehaviorSaveAllComplete,
    });

    const {save: saveLambda, isSaving: isSavingLambda} = useLambdaSave({
        onMergeRequired: handleMergeRequired,
    });

    // Per-kind apply-revision-to-scene hooks. Each pins the chosen revision
    // into the scene's resolution context, refreshes editor registries, and
    // (in collaborative mode) triggers a scene save so other clients pick
    // up the change.
    const applySceneBehaviorRevision = useApplySceneBehaviorRevision();
    const applySceneLambdaRevision = useApplySceneLambdaRevision();
    const applySceneScriptRevision = useApplySceneScriptRevision();

    const createScriptRevision = useCreateScriptRevision();
    const createScriptAsset = useCreateScript();
    const {mutateAsync: updateAssetMeta, isPending: isUpdatingAssetMeta} = useUpdateAsset();

    const isSaving = isSavingBehavior || isSavingLambda || isUpdatingAssetMeta;

    // --- Save handlers -----------------------------------------------------
    const getBehaviorRevisionData = useGetBehaviorRevisionData();
    const getScriptRevisionData = useGetScriptRevisionData();

    const handleSave = useCallback(async () => {
        if (!activeEntry) return;

        if (activeEntry.kind === "behavior") {
            const mod = getModifiedBehavior(activeEntry.id);
            if (!mod?.baseRevisionId) return;
            const code = mod.code ?? behaviorOriginalCode ?? "";
            const config = mod.config ?? behaviorOriginalConfig;
            if (!config) return;
            const success = await saveBehavior({
                behaviorId: activeEntry.id,
                revisionId: mod.baseRevisionId,
                code,
                config,
                name: mod.name,
                description: mod.description,
                tags: mod.tags,
            });
            if (success) return;
        }

        if (activeEntry.kind === "lambda") {
            const mod = getModifiedLambda(activeEntry.id);
            if (!mod?.baseRevisionId) return;
            const code = mod.code ?? lambdaOriginalCode ?? "";
            const configStr = mod.configStr ?? (lambdaOriginalConfig ? JSON.stringify(lambdaOriginalConfig) : "{}");
            const success = await saveLambda({
                lambdaAssetId: activeEntry.id,
                revisionId: mod.baseRevisionId,
                code,
                configStr,
                name: mod.name,
            });
            if (success) clearLambdaChanges(activeEntry.id);
        }

        if (activeEntry.kind === "script") {
            const mod = getModifiedScript(activeEntry.id);
            if (!mod?.baseRevisionId) return;
            const code = mod.code ?? scriptOriginalCode ?? "";
            try {
                const revision = await createScriptRevision({
                    id: activeEntry.id,
                    parentRevisionId: mod.baseRevisionId,
                    code,
                });
                await updateSceneScriptRevision({
                    assetId: activeEntry.id,
                    revisionId: revision.id,
                    code,
                });
                if (mod.name !== undefined) {
                    await updateAssetMeta({
                        assetId: activeEntry.id,
                        name: mod.name,
                    });
                }
                clearScriptChanges(activeEntry.id);
                showToast({type: "success", title: "Script saved"});
            } catch (err) {
                console.error("Failed to save import:", err);
                showToast({type: "error", title: "Failed to save import"});
            }
        }

        if (activeEntry.kind === "file") {
            const mod = getModifiedFile(activeEntry.id);
            if (!mod?.baseRevisionId || mod.text === undefined) return;
            const ext = activeEntry.name.split(".").pop()?.toLowerCase() ?? "";
            const mimeMap: Record<string, string> = {
                json: "application/json", html: "text/html", css: "text/css",
                xml: "application/xml", svg: "image/svg+xml", yaml: "text/yaml", yml: "text/yaml",
            };
            try {
                await createAssetRevision({
                    assetId: activeEntry.id,
                    parentRevisionId: mod.baseRevisionId,
                    data: mod.text,
                    format: ext,
                    contentType: mimeMap[ext] ?? "text/plain",
                });
                clearFileChanges(activeEntry.id);
                showToast({type: "success", title: "File saved"});
            } catch (err) {
                console.error("Failed to save file:", err);
                showToast({type: "error", title: "Failed to save file"});
            }
        }
    }, [
        activeEntry, getModifiedBehavior, getModifiedScript, getModifiedLambda, getModifiedFile,
        behaviorOriginalCode, behaviorOriginalConfig,
        scriptOriginalCode,
        lambdaOriginalCode, lambdaOriginalConfig,
        saveBehavior, saveLambda, createScriptRevision, updateSceneScriptRevision, updateAssetMeta,
        clearScriptChanges, clearLambdaChanges, clearFileChanges,
    ]);

    const handleSaveAll = useCallback(async () => {
        // Save all dirty behaviors
        const behaviorEntries: Array<{
            behaviorId: string; revisionId: string; code: string;
            config: BehaviorConfig; name?: string; description?: string; tags?: string[];
        }> = [];

        for (const [id, mod] of Object.entries(modifiedBehaviors)) {
            if (!mod.baseRevisionId) continue;
            let code = mod.code;
            let config = mod.config;
            if (!code || !config) {
                try {
                    const orig = await getBehaviorRevisionData(id, mod.baseRevisionId);
                    code = code || orig.code;
                    config = config || orig.config;
                } catch { continue; }
            }
            behaviorEntries.push({
                behaviorId: id,
                revisionId: mod.baseRevisionId,
                code: code,
                config: config,
                name: mod.name,
                description: mod.description,
                tags: mod.tags,
            });
        }

        if (behaviorEntries.length > 0) {
            await saveAllBehaviors(behaviorEntries);
        }

        // Save all dirty lambdas (one by one — no saveAll for lambdas yet)
        for (const [id, mod] of Object.entries(modifiedLambdas)) {
            if (!mod.baseRevisionId) continue;
            if (mod.code === undefined && mod.configStr === undefined && mod.name === undefined) continue;
            const code = mod.code ?? "";
            const configStr = mod.configStr ?? "{}";
            const success = await saveLambda({
                lambdaAssetId: id,
                revisionId: mod.baseRevisionId,
                code,
                configStr,
                name: mod.name,
            });
            if (success) clearLambdaChanges(id);
        }

        for (const [id, mod] of Object.entries(modifiedScripts)) {
            if (!mod.baseRevisionId) continue;
            if (mod.code === undefined && mod.name === undefined) continue;
            try {
                const code =
                    mod.code ??
                    (await getScriptRevisionData(id, mod.baseRevisionId)).code;
                const revision = await createScriptRevision({
                    id,
                    parentRevisionId: mod.baseRevisionId,
                    code,
                });
                await updateSceneScriptRevision({
                    assetId: id,
                    revisionId: revision.id,
                    code,
                });
                if (mod.name !== undefined) {
                    await updateAssetMeta({
                        assetId: id,
                        name: mod.name,
                    });
                }
                clearScriptChanges(id);
            } catch (err) {
                console.error(`Failed to save import ${id}:`, err);
            }
        }

        // Save all dirty file assets
        for (const [id, mod] of Object.entries(modifiedFiles)) {
            if (!mod.baseRevisionId || mod.text === undefined) continue;
            try {
                await createAssetRevision({
                    assetId: id,
                    parentRevisionId: mod.baseRevisionId,
                    data: mod.text,
                    format: "txt",
                    contentType: "text/plain",
                });
                clearFileChanges(id);
            } catch (err) {
                console.error(`Failed to save file ${id}:`, err);
            }
        }
    }, [
        modifiedBehaviors, modifiedLambdas, modifiedScripts, modifiedFiles,
        getBehaviorRevisionData, getScriptRevisionData, saveAllBehaviors, saveLambda,
        createScriptRevision, updateSceneScriptRevision, updateAssetMeta,
        clearScriptChanges, clearLambdaChanges, clearFileChanges,
    ]);

    // --- Creation popups ---------------------------------------------------
    const [showNewBehaviorPopup, setShowNewBehaviorPopup] = useState(false);
    const [showNewLambdaPopup, setShowNewLambdaPopup] = useState(false);
    const [showNewImportPopup, setShowNewImportPopup] = useState(false);
    const [importMenuAnchor, setImportMenuAnchor] = useState<DOMRect | null>(null);
    const [showPacksPicker, setShowPacksPicker] = useState(false);
    const importFromFile = useImportFromFile();
    const [newLambdaName, setNewLambdaName] = useState("");
    const [newImportName, setNewImportName] = useState("");
    const [isCreatingLambda, setIsCreatingLambda] = useState(false);
    const [isCreatingImport, setIsCreatingImport] = useState(false);
    const createLambdaAsset = useCreateLambda();
    const [showNewFileDialog, setShowNewFileDialog] = useState(false);
    const [newFileName, setNewFileName] = useState("");
    const [isCreatingFile, setIsCreatingFile] = useState(false);
    const newFileInputRef = useRef<HTMLInputElement>(null);

    // Auto-open creation dialog when launched with createKind. Re-fires when the
    // outliner +-button is clicked while the editor is already mounted; the parent
    // clears createKind via onCreateKindConsumed so the next run early-returns.
    useEffect(() => {
        if (!initialSelection?.createKind) return;
        if (initialSelection.createKind === "behavior") {
            setShowNewBehaviorPopup(true);
        } else if (initialSelection.createKind === "lambda") {
            setShowNewLambdaPopup(true);
        } else if (initialSelection.createKind === "script") {
            setShowNewImportPopup(true);
        }
        onCreateKindConsumed?.();
    }, [initialSelection?.createKind, onCreateKindConsumed]);

    const handleCreateNewBehavior = useCallback(async ({name, description}: INewBehaviorData) => {
        const config = {...DEFAULT_BEHAVIOR_CONFIG, name, description: description ?? ""};
        const asset = await createBehavior({
            assetSource: global.app?.editor?.assetSource,
            name,
            code: ScriptTemplate,
            config,
            description,
        });
        setShowNewBehaviorPopup(false);
        setActiveEntry({kind: "behavior", id: asset.id, name});
    }, [setActiveEntry]);

    const handleCreateNewLambda = useCallback(async () => {
        if (!newLambdaName) return;
        setIsCreatingLambda(true);
        try {
            const lambdaConfig = {
                id: newLambdaName.replace(/\s+/g, "-").toLowerCase(),
                name: newLambdaName,
                description: "",
                version: "1.0.0",
                author: dbUser?.username ?? "",
                components: {},
            };
            const defaultCode = LAMBDA_SCRIPT_TEMPLATE;
            const asset = await createLambdaAsset({
                name: newLambdaName,
                config: JSON.stringify(lambdaConfig),
                code: defaultCode,
            });

            // Register in local registry for immediate dropdown update
            const editor = global.app?.editor;
            if (editor?.lambdaConfigRegistry) {
                editor.lambdaConfigRegistry.setAssetMeta(lambdaConfig.id, {
                    assetId: asset.id,
                    revisionId: asset.headRevisionId,
                });
                editor.lambdaConfigRegistry.registerConfig(lambdaConfig.id, lambdaConfig as any);
            }

            setShowNewLambdaPopup(false);
            setNewLambdaName("");
            setActiveEntry({kind: "lambda", id: asset.id, name: newLambdaName});
        } catch (err) {
            console.error("Failed to create lambda:", err);
            showToast({type: "error", title: "Failed to create lambda"});
        } finally {
            setIsCreatingLambda(false);
        }
    }, [newLambdaName, dbUser?.username, createLambdaAsset, setActiveEntry]);

    const handleCreateNewImport = useCallback(async () => {
        if (!newImportName) return;
        setIsCreatingImport(true);
        try {
            const asset = await createScriptAsset({
                sceneId,
                name: newImportName,
                code: "",
            });

            setShowNewImportPopup(false);
            setNewImportName("");
            setActiveEntry({kind: "script", id: asset.id, name: newImportName});
        } catch (err) {
            console.error("Failed to create import:", err);
            showToast({type: "error", title: "Failed to create import"});
        } finally {
            setIsCreatingImport(false);
        }
    }, [createScriptAsset, newImportName, sceneId, setActiveEntry]);

    const handleConfirmNewFile = useCallback(async () => {
        const trimmed = newFileName.trim();
        if (!trimmed) return;
        const ext = trimmed.split(".").pop()?.toLowerCase() ?? "";
        if (!ext || ext === trimmed) {
            showToast({type: "error", title: "Filename must include an extension (e.g. config.json)"});
            return;
        }
        const mimeMap: Record<string, string> = {
            json: "application/json", html: "text/html", css: "text/css",
            xml: "application/xml", svg: "image/svg+xml", yaml: "text/yaml", yml: "text/yaml",
            js: "text/javascript", mjs: "text/javascript", cjs: "text/javascript",
            ts: "text/typescript", tsx: "text/typescript", jsx: "text/javascript",
            md: "text/markdown", txt: "text/plain", sh: "text/x-shellscript",
            glsl: "text/plain", vert: "text/plain", frag: "text/plain",
        };
        setIsCreatingFile(true);
        try {
            const asset = await createSceneAssetWithData({
                sceneId,
                type: AssetType.File,
                name: trimmed,
                format: ext,
                contentType: mimeMap[ext] ?? "text/plain",
                data: "",
            });
            setShowNewFileDialog(false);
            setNewFileName("");
            // Invalidate asset tree so the new file shows up
            void defaultQueryClient.invalidateQueries({queryKey: assetKeys.sceneLists(sceneId)});
            // Auto-select the new file after a short delay for the tree to refresh
            setTimeout(() => {
                setActiveEntry({kind: "file", id: asset.id, name: trimmed});
            }, 300);
            showToast({type: "success", title: `Created ${trimmed}`});
        } catch (err) {
            console.error("Failed to create file:", err);
            showToast({type: "error", title: "Failed to create file"});
        } finally {
            setIsCreatingFile(false);
        }
    }, [newFileName, sceneId, setActiveEntry]);

    // --- Quick-open palette (Cmd+P) -----------------------------------------
    const [showQuickOpen, setShowQuickOpen] = useState(false);

    const allEntries = useMemo(() => {
        return [...folders.behaviors, ...folders.lambdas, ...folders.scripts, ...folders.files];
    }, [folders]);

    // Set of specifiers (asset IDs and lowercased names) that the editor uses
    // to validate `@import "x" as y` directives. We pass this to BehaviorEditor
    // so unresolved imports surface as error markers in the gutter.
    const availableImportSpecifiers = useMemo(() => {
        const set = new Set<string>();
        for (const entry of folders.scripts) {
            if (entry.id) set.add(entry.id);
            if (entry.name) set.add(entry.name.trim().toLowerCase());
        }
        return set;
    }, [folders.scripts]);

    const handleQuickOpenSelect = useCallback(
        (entry: AssetTreeEntry) => {
            setActiveEntry(entry);
            setShowQuickOpen(false);
        },
        [setActiveEntry],
    );

    // --- Keyboard shortcuts ------------------------------------------------
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target;
            const isInsideEditor =
                target instanceof Node && editorContainerRef.current?.contains(target) && isEventInsideMonaco(e);

            if (isInsideEditor && shouldGuardEditorShortcut(e)) {
                e.preventDefault();
            }

            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                e.stopPropagation();
                if (e.shiftKey) {
                    void handleSaveAll();
                } else {
                    void handleSave();
                }
            }

            // Cmd+P — quick-open file palette (VS Code style)
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "p") {
                e.preventDefault();
                e.stopPropagation();
                setShowQuickOpen(prev => !prev);
            }

            // Cmd+Shift+F toggles the cross-file search panel.
            // Cmd+F is left to Monaco's native find widget.
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
                e.preventDefault();
                e.stopPropagation();
                setShowSearchPanel(prev => !prev);
            }

            // Cmd+Shift+R — prevent browser hard-refresh; Monaco handles
            // find-replace via the intellij keybinding registered on the editor.
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "r") {
                e.preventDefault();
                e.stopPropagation();
            }

            // Escape closes quick-open if open
            if (e.key === "Escape" && showQuickOpen) {
                e.preventDefault();
                e.stopPropagation();
                setShowQuickOpen(false);
            }
        };

        const doc = modalRef.current?.ownerDocument ?? document;
        doc.addEventListener("keydown", handleKeyDown, {capture: true});
        return () => doc.removeEventListener("keydown", handleKeyDown, {capture: true});
    }, [handleSave, handleSaveAll, showQuickOpen]);

    // --- Close handling ----------------------------------------------------
    const showConfirmInOwnerWindow = useCallback(
        (opts: {title: string; content: string; onOK?: () => void}) => {
            const ownerWin = modalRef.current?.ownerDocument?.defaultView;
            if (ownerWin && ownerWin !== window) {
                if (ownerWin.confirm(`${opts.title}\n\n${opts.content}`)) opts.onOK?.();
                return;
            }
            ElementsUtils.confirm(opts);
        },
        [],
    );

    const handleClose = useCallback(() => {
        if (hasAnyChanges) {
            showConfirmInOwnerWindow({
                title: "Discard changes?",
                content: "You have unsaved changes. Are you sure you want to close?",
                onOK: onClose,
            });
        } else {
            onClose();
        }
    }, [hasAnyChanges, onClose, showConfirmInOwnerWindow]);

    // --- Content change from Monaco ----------------------------------------
    const handleFileContentChange = useCallback(
        (fileId: string, content: string) => {
            if (!activeEntry) return;
            const {tab} = parseMonacoFileId(fileId, activeEntry.kind);
            const treeEntry = findEntry(activeEntry.kind, activeEntry.id);
            const revisionId = (treeEntry)?.headRevisionId ?? "";

            if (activeEntry.kind === "behavior") {
                if (tab === "config") {
                    try {
                        const config = JSON.parse(content) as BehaviorConfig;
                        updateBehavior(activeEntry.id, {config}, revisionId);
                    } catch { /* invalid JSON */ }
                } else {
                    updateBehavior(activeEntry.id, {code: content}, revisionId);
                }
            } else if (activeEntry.kind === "script") {
                updateScript(activeEntry.id, {code: content}, revisionId);
            } else if (activeEntry.kind === "lambda") {
                updateLambda(activeEntry.id, {code: content}, revisionId);
            } else if (activeEntry.kind === "file") {
                updateFile(activeEntry.id, {text: content}, revisionId);
            }
        },
        [activeEntry, findEntry, updateBehavior, updateScript, updateLambda, updateFile],
    );

    // --- Tree selection handler --------------------------------------------
    const handleTreeSelect = useCallback(
        (entry: AssetTreeEntry) => {
            setActiveEntry(entry);
        },
        [setActiveEntry],
    );

    // --- Search panel navigation -------------------------------------------
    const [pendingLineNumber, setPendingLineNumber] = useState<number | undefined>(undefined);

    const handleSearchNavigate = useCallback(
        (kind: AssetKind, id: string, lineNumber: number) => {
            const entry = findEntry(kind, id);
            if (entry) {
                setActiveEntry(entry);
                setPendingLineNumber(lineNumber);
            }
        },
        [findEntry, setActiveEntry],
    );

    // Clear pending line number after it's been consumed by a render cycle.
    useEffect(() => {
        if (pendingLineNumber !== null && pendingLineNumber !== undefined) {
            const timeout = setTimeout(() => setPendingLineNumber(undefined), 200);
            return () => clearTimeout(timeout);
        }
    }, [pendingLineNumber]);

    // --- Popout handler ----------------------------------------------------
    const handlePopOut = useCallback(() => {
        onPopOut?.({
            initialSelection: activeEntry
                ? {kind: activeEntry.kind, id: activeEntry.id}
                : undefined,
            initialDraftsByKind: {
                behavior: {...modifiedBehaviors},
                script: {...modifiedScripts},
                lambda: {...modifiedLambdas},
            },
        });
    }, [activeEntry, modifiedBehaviors, modifiedScripts, modifiedLambdas, onPopOut]);

    // --- Merge modal handlers ----------------------------------------------
    const handleMergeSave = useCallback(
        (merged: string) => {
            mergeModal.resolve?.({canceled: false, mergedText: merged});
            setMergeModal(INITIAL_MERGE);
        },
        [mergeModal],
    );

    const handleMergeCancel = useCallback(() => {
        mergeModal.resolve?.({canceled: true, mergedText: ""});
        setMergeModal(INITIAL_MERGE);
    }, [mergeModal]);

    // --- Revision actions (Open in editor / Apply to scene) -----------------
    // Both actions discard local edits — gate behind a confirm when there
    // are unsaved changes for that asset.
    const confirmDiscardIfDirty = useCallback(
        (kind: AssetKind, id: string, action: () => void) => {
            if (hasChanges(kind, id)) {
                showConfirmInOwnerWindow({
                    title: "Discard changes?",
                    content: "You have unsaved changes. Continuing will discard them. Continue?",
                    onOK: action,
                });
            } else {
                action();
            }
        },
        [hasChanges, showConfirmInOwnerWindow],
    );

    const handleOpenBehaviorRevisionInEditor = useCallback(
        (revisionId: string) => {
            if (!activeEntry || activeEntry.kind !== "behavior") return;
            const id = activeEntry.id;
            confirmDiscardIfDirty("behavior", id, () => {
                clearBehaviorChanges(id);
                // forceBaseRevisionId without field changes leaves hasChanges()
                // false; useBehaviorData refetches at the new revision and the
                // editor re-renders with that content.
                updateBehavior(id, {}, revisionId, {forceBaseRevisionId: true});
                showToast({type: "success", title: "Loaded revision into editor (scene unchanged)"});
            });
        },
        [activeEntry, confirmDiscardIfDirty, clearBehaviorChanges, updateBehavior],
    );

    const handleApplyBehaviorRevisionToScene = useCallback(
        (_event: React.MouseEvent, revisionId: string) => {
            if (!activeEntry || activeEntry.kind !== "behavior") return;
            const id = activeEntry.id;
            confirmDiscardIfDirty("behavior", id, () => {
                applySceneBehaviorRevision(id, revisionId)
                    .then(() => {
                        clearBehaviorChanges(id);
                        showToast({type: "success", title: "Applied revision to scene"});
                    })
                    .catch(err => {
                        console.error("Failed to apply behavior revision:", err);
                        showToast({type: "error", title: "Failed to apply revision"});
                    });
            });
        },
        [activeEntry, confirmDiscardIfDirty, applySceneBehaviorRevision, clearBehaviorChanges],
    );

    const handleOpenLambdaRevisionInEditor = useCallback(
        (revisionId: string) => {
            if (!activeEntry || activeEntry.kind !== "lambda") return;
            const id = activeEntry.id;
            confirmDiscardIfDirty("lambda", id, () => {
                clearLambdaChanges(id);
                updateLambda(id, {}, revisionId, {forceBaseRevisionId: true});
                showToast({type: "success", title: "Loaded revision into editor (scene unchanged)"});
            });
        },
        [activeEntry, confirmDiscardIfDirty, clearLambdaChanges, updateLambda],
    );

    const handleApplyLambdaRevisionToScene = useCallback(
        (_event: React.MouseEvent, revisionId: string) => {
            if (!activeEntry || activeEntry.kind !== "lambda") return;
            const id = activeEntry.id;
            confirmDiscardIfDirty("lambda", id, () => {
                applySceneLambdaRevision(id, revisionId)
                    .then(() => {
                        clearLambdaChanges(id);
                        showToast({type: "success", title: "Applied revision to scene"});
                    })
                    .catch(err => {
                        console.error("Failed to apply lambda revision:", err);
                        showToast({type: "error", title: "Failed to apply revision"});
                    });
            });
        },
        [activeEntry, confirmDiscardIfDirty, applySceneLambdaRevision, clearLambdaChanges],
    );

    const handleOpenScriptRevisionInEditor = useCallback(
        (revisionId: string) => {
            if (!activeEntry || activeEntry.kind !== "script") return;
            const id = activeEntry.id;
            confirmDiscardIfDirty("script", id, () => {
                clearScriptChanges(id);
                updateScript(id, {}, revisionId, {forceBaseRevisionId: true});
                showToast({type: "success", title: "Loaded revision into editor (scene unchanged)"});
            });
        },
        [activeEntry, confirmDiscardIfDirty, clearScriptChanges, updateScript],
    );

    const handleApplyScriptRevisionToScene = useCallback(
        (_event: React.MouseEvent, revisionId: string) => {
            if (!activeEntry || activeEntry.kind !== "script") return;
            const id = activeEntry.id;
            confirmDiscardIfDirty("script", id, () => {
                applySceneScriptRevision(id, revisionId)
                    .then(() => {
                        clearScriptChanges(id);
                        showToast({type: "success", title: "Applied revision to scene"});
                    })
                    .catch(err => {
                        console.error("Failed to apply script revision:", err);
                        showToast({type: "error", title: "Failed to apply revision"});
                    });
            });
        },
        [activeEntry, confirmDiscardIfDirty, applySceneScriptRevision, clearScriptChanges],
    );

    // --- Right panel -------------------------------------------------------
    const renderRightPanel = () => {
        if (!activeEntry) return null;
        const treeEntry = findEntry(activeEntry.kind, activeEntry.id);

        if (activeEntry.kind === "behavior") {
            const mod = getModifiedBehavior(activeEntry.id);
            const config = mod?.config ?? behaviorOriginalConfig;
            return (
                <BehaviorPanel
                    entry={treeEntry ?? (activeEntry as AssetTreeEntry)}
                    revisionId={behaviorRevisionId ?? ""}
                    sceneRevisionId={treeEntry?.headRevisionId}
                    config={config ?? undefined}
                    code={mod?.code ?? behaviorOriginalCode ?? undefined}
                    name={mod?.name ?? treeEntry?.name}
                    description={mod?.description ?? behaviorOriginalConfig?.description}
                    documentation={config?.documentation}
                    tags={mod?.tags ?? treeEntry?.tags}
                    disabled={isSaving}
                    onUpdate={updateBehavior}
                    onApplyRevisionToScene={handleApplyBehaviorRevisionToScene}
                    onOpenRevisionInEditor={handleOpenBehaviorRevisionInEditor}
                />
            );
        }

        if (activeEntry.kind === "lambda") {
            const mod = getModifiedLambda(activeEntry.id);
            const configStr = mod?.configStr;
            const configObj = configStr
                ? (() => { try { return JSON.parse(configStr); } catch { return undefined; } })()
                : lambdaOriginalConfig;
            return (
                <LambdaPanel
                    entry={treeEntry ?? (activeEntry as AssetTreeEntry)}
                    revisionId={lambdaRevisionId ?? ""}
                    sceneRevisionId={treeEntry?.headRevisionId}
                    name={mod?.name ?? lambdaOriginalConfig?.name ?? treeEntry?.name}
                    configObj={configObj}
                    disabled={isSaving}
                    onUpdate={updateLambda}
                    onApplyRevisionToScene={handleApplyLambdaRevisionToScene}
                    onOpenRevisionInEditor={handleOpenLambdaRevisionInEditor}
                />
            );
        }

        if (activeEntry.kind === "script") {
            const mod = getModifiedScript(activeEntry.id);
            return (
                <ScriptPanel
                    entry={treeEntry ?? (activeEntry as AssetTreeEntry)}
                    revisionId={importRevisionId ?? ""}
                    sceneRevisionId={treeEntry?.headRevisionId}
                    name={mod?.name ?? treeEntry?.name}
                    disabled={isSaving}
                    onUpdate={updateScript}
                    onApplyRevisionToScene={handleApplyScriptRevisionToScene}
                    onOpenRevisionInEditor={handleOpenScriptRevisionInEditor}
                />
            );
        }

        if (activeEntry.kind === "file") {
            return <FilePanel entry={treeEntry ?? (activeEntry as AssetTreeEntry)} />;
        }

        return null;
    };

    // --- Shell theme colors (match editor theme) ----------------------------
    const [shellThemeStyle, setShellThemeStyle] = useState<React.CSSProperties>({});

    // Refresh shell colors whenever the editor's theme is applied.
    useEffect(() => {
        const applyColors = () => {
            const colors = getEditorThemeColors();
            if (colors) {
                setShellThemeStyle({
                    "--ce-bg": colors.background,
                    "--ce-fg": colors.foreground,
                    "--ce-border": colors.borderColor,
                    "--ce-sidebar-bg": colors.sidebarBg,
                    "--ce-bg-lighter": colors.bgLighter,
                    "--ce-tab-active-border": colors.tabActiveBorder,
                } as React.CSSProperties);
            }
        };

        // Apply immediately (may already be loaded from cache)
        applyColors();

        // Re-apply after a short delay (covers async initial theme load)
        const timer = setTimeout(applyColors, 500);

        // Listen for theme changes dispatched by applyEditorTheme
        window.addEventListener("ce-theme-changed", applyColors);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("ce-theme-changed", applyColors);
        };
    }, []);

    // --- Render ------------------------------------------------------------
    const isLoadingContent = isContentLoading || (isTreeLoading && !activeEntry);

    const content = (
                <ModalContent style={shellThemeStyle}>
                    <ModalHeader>
                        <span className="heading">Stem Studio Code Editor</span>
                        <ButtonsWrapper>
                            <Tooltip text="Save (Cmd+S)" height="auto">
                                <HeaderIconBtn
                                    $accent
                                    aria-label="Save"
                                    onClick={() => void handleSave()}
                                    disabled={!activeEntry || !hasChanges(activeEntry.kind, activeEntry.id) || isSaving}
                                >
                                    <TbDeviceFloppy size={18} />
                                </HeaderIconBtn>
                            </Tooltip>
                            <Tooltip text="Save All (Cmd+Shift+S)" height="auto">
                                <HeaderIconBtn
                                    aria-label="Save All"
                                    onClick={() => void handleSaveAll()}
                                    disabled={!hasAnyChanges || isSaving}
                                >
                                    <TbFiles size={17} />
                                </HeaderIconBtn>
                            </Tooltip>
                            <Tooltip
                                text={showDetailsPanel ? "Hide Details Panel" : "Show Details Panel"}
                                height="auto"
                            >
                                <HeaderIconBtn
                                    $accent={showDetailsPanel}
                                    aria-label={showDetailsPanel ? "Hide Details Panel" : "Show Details Panel"}
                                    aria-pressed={showDetailsPanel}
                                    onClick={() => setShowDetailsPanel(v => !v)}
                                >
                                    <TbLayoutSidebarLeftExpand size={18} />
                                </HeaderIconBtn>
                            </Tooltip>
                            {onPin && (
                                <Tooltip text={isPinned ? "Unpin" : "Pin to Side"} height="auto">
                                    <HeaderIconBtn
                                        $accent={isPinned}
                                        aria-label={isPinned ? "Unpin" : "Pin to Side"}
                                        onClick={onPin}
                                    >
                                        <TbLayoutSidebarRightExpand size={18} />
                                    </HeaderIconBtn>
                                </Tooltip>
                            )}
                            {onPopOut && (
                                <Tooltip
                                    text={isDesktopDevice() ? "Pop Out" : "Not available on mobile"}
                                    height="auto"
                                >
                                    <HeaderIconBtn
                                        aria-label="Pop Out"
                                        onClick={isDesktopDevice() ? handlePopOut : undefined}
                                        disabled={!isDesktopDevice()}
                                    >
                                        <HiOutlineArrowTopRightOnSquare size={18} />
                                    </HeaderIconBtn>
                                </Tooltip>
                            )}
                            {onRestoreInline && (
                                <Tooltip text="Restore editor back to main window" height="auto">
                                    <HeaderTextBtn
                                        aria-label="Restore Inline"
                                        onClick={onRestoreInline}
                                    >
                                        <HiOutlineArrowDownOnSquare size={14} />
                                        Restore
                                    </HeaderTextBtn>
                                </Tooltip>
                            )}
                            <Tooltip text="Close" height="auto">
                                <HeaderIconBtn aria-label="Close" onClick={handleClose}>
                                    <HiOutlineXMark size={18} />
                                </HeaderIconBtn>
                            </Tooltip>
                        </ButtonsWrapper>
                    </ModalHeader>

                    <BodyWrapper>
                        <ResizableFileTree>
                            <LeftPanel>
                                <AssetTree
                                    folders={folders}
                                    activeEntry={activeEntry}
                                    onSelect={handleTreeSelect}
                                    onSearchChange={setSearch}
                                    hasChanges={hasChanges}
                                    isLoading={isTreeLoading}
                                    totalCount={totalCount}
                                    onCreateBehavior={() => setShowNewBehaviorPopup(true)}
                                    onCreateLambda={() => setShowNewLambdaPopup(true)}
                                    onCreateScript={(anchor) => setImportMenuAnchor(anchor)}
                                    onCreateFile={() => setShowNewFileDialog(true)}
                                    sortMode={sortMode}
                                    onSortModeChange={handleSortModeChange}
                                />
                            </LeftPanel>
                        </ResizableFileTree>

                        <EditorSurface ref={editorContainerRef}>
                            {isSaving && <Loading loadingDescription="Saving..." />}
                            {!isSaving && isLoadingContent && <Loading loadingDescription="Loading..." />}

                            {!activeEntry && !isTreeLoading && totalCount === 0 && (
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%",
                                    color: "#888",
                                    gap: 12,
                                    userSelect: "none",
                                }}>
                                    <span style={{fontSize: 14}}>No behaviors, lambdas, imports, or files in this scene.</span>
                                    <span style={{fontSize: 12, color: "#666"}}>
                                        Create one using the + buttons in the left panel.
                                    </span>
                                </div>
                            )}

                            <BehaviorEditor
                                disabled={isLoadingContent || isSaving}
                                files={monacoFiles}
                                initialSelectedId={initialSelectedId}
                                initialLineNumber={pendingLineNumber ?? initialSelection?.lineNumber}
                                onFileContentChange={handleFileContentChange}
                                showToolbar
                                scriptType={scriptType}
                                availableImportSpecifiers={availableImportSpecifiers}
                            />

                            {showSearchPanel && (
                                <SearchResultsPanel
                                    globalSearch={globalSearch}
                                    onNavigate={handleSearchNavigate}
                                    onClose={() => setShowSearchPanel(false)}
                                />
                            )}

                            {showQuickOpen && (
                                <QuickOpenPalette
                                    entries={allEntries}
                                    onSelect={handleQuickOpenSelect}
                                    onClose={() => setShowQuickOpen(false)}
                                />
                            )}
                        </EditorSurface>

                        {showDetailsPanel && (
                            <ResizableSettingsPanel initialWidth={isPinned ? 250 : undefined}>
                                {renderRightPanel()}
                            </ResizableSettingsPanel>
                        )}
                    </BodyWrapper>
                </ModalContent>
    );

    return (
        <>
            {isPinned ? (
                <div ref={modalRef} style={{flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden"}}>
                    {content}
                </div>
            ) : (
                <ModalOverlay ref={modalRef}>
                    {content}
                </ModalOverlay>
            )}

            {mergeModal.isOpen && (
                <TextMergeModal
                    isOpen={mergeModal.isOpen}
                    baseText={mergeModal.baseText}
                    localText={mergeModal.localText}
                    latestText={mergeModal.latestText}
                    onSave={handleMergeSave}
                    onCancel={handleMergeCancel}
                />
            )}

            {showNewBehaviorPopup && (
                <CreateBehaviorMetadataPopup
                    onCancel={() => setShowNewBehaviorPopup(false)}
                    onCreateNewBehavior={handleCreateNewBehavior}
                />
            )}

            {showNewLambdaPopup && (
                <CreateLambdaMetadataPopup
                    title="Lambda Details"
                    textInputData={{label: "Name", value: newLambdaName, setValue: setNewLambdaName, placeholder: "Enter lambda name"}}
                    saveDisabled={!newLambdaName || isCreatingLambda}
                    onSave={() => void handleCreateNewLambda()}
                    onCancel={() => { setShowNewLambdaPopup(false); setNewLambdaName(""); }}
                    saveLabel={isCreatingLambda ? "Creating..." : undefined}
                />
            )}

            {showNewImportPopup && (
                <CreateLambdaMetadataPopup
                    title="New Script"
                    textInputData={{
                        label: "Name",
                        value: newImportName,
                        setValue: setNewImportName,
                        placeholder: "Enter import module name",
                    }}
                    saveDisabled={!newImportName || isCreatingImport}
                    onSave={() => void handleCreateNewImport()}
                    onCancel={() => { setShowNewImportPopup(false); setNewImportName(""); }}
                    saveLabel={isCreatingImport ? "Creating..." : undefined}
                />
            )}

            <AddImportMenu
                anchor={importMenuAnchor}
                onClose={() => setImportMenuAnchor(null)}
                onBrowsePacks={() => setShowPacksPicker(true)}
                onUploadFile={() => {
                    selectFile({
                        accept: ".js,.mjs,.cjs,.yaml,.yml",
                        onFileSelected: async (file) => {
                            const created = await importFromFile(file, sceneId);
                            if (created) {
                                setActiveEntry({kind: "script", id: created.id, name: created.name});
                            }
                        },
                    });
                }}
                onNewEmpty={() => setShowNewImportPopup(true)}
            />

            <ImportPacksPicker
                open={showPacksPicker}
                onClose={() => setShowPacksPicker(false)}
                existingPackNames={folders.scripts.map(i => i.name)}
                onAddPack={async (pack) => {
                    const asset = await createScriptAsset({
                        sceneId,
                        name: pack.name,
                        code: pack.code,
                    });
                    setActiveEntry({kind: "script", id: asset.id, name: pack.name});
                }}
            />

            {showNewFileDialog && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 10000,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.5)",
                    }}
                    onClick={() => { setShowNewFileDialog(false); setNewFileName(""); }}
                >
                    <div
                        style={{
                            background: "var(--ce-bg, #1e1e1e)", border: "1px solid var(--ce-border, #333)",
                            borderRadius: 8, padding: "20px 24px", minWidth: 320,
                            display: "flex", flexDirection: "column", gap: 12,
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <span style={{color: "var(--ce-fg, #ccc)", fontSize: 14, fontWeight: 600}}>
                            New File
                        </span>
                        <input
                            ref={newFileInputRef}
                            type="text"
                            value={newFileName}
                            onChange={e => setNewFileName(e.target.value)}
                            placeholder="e.g. config.json"
                            autoFocus
                            onKeyDown={e => {
                                if (e.key === "Enter") void handleConfirmNewFile();
                                if (e.key === "Escape") { setShowNewFileDialog(false); setNewFileName(""); }
                            }}
                            style={{
                                background: "var(--ce-bg-lighter, #252526)", color: "var(--ce-fg, #ccc)",
                                border: "1px solid var(--ce-border, #333)", borderRadius: 4,
                                padding: "6px 10px", fontSize: 13, outline: "none",
                            }}
                        />
                        <div style={{display: "flex", gap: 8, justifyContent: "flex-end"}}>
                            <HeaderTextBtn
                                onClick={() => { setShowNewFileDialog(false); setNewFileName(""); }}
                            >
                                Cancel
                            </HeaderTextBtn>
                            <HeaderTextBtn
                                disabled={!newFileName.trim() || isCreatingFile}
                                onClick={() => void handleConfirmNewFile()}
                                style={{background: "#2563eb", color: "#fff", borderColor: "#2563eb"}}
                            >
                                {isCreatingFile ? "Creating..." : "Create"}
                            </HeaderTextBtn>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
};
