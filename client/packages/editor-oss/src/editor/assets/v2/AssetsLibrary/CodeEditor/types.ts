/**
 * Shared types for the CodeEditor.
 *
 * The code editor folds three historical editors (BehaviorCreator,
 * LambdaEditor, FileViewerModal) into a single shell. Each asset kind has
 * slightly different data, so the shell treats everything as an
 * {@link AssetEditorEntry} and dispatches to kind-specific panels +
 * state delegates internally.
 */

export type AssetKind = "behavior" | "lambda" | "script" | "file";

/** Sort/filter modes for the left-panel asset tree. */
export type SortMode = "name" | "modified" | "changed";

/**
 * Uniform entry in the left-panel asset tree.
 *
 * This is intentionally lightweight — kind-specific data (behavior config,
 * lambda attributes, file metadata) is fetched by the kind delegate when
 * the entry becomes active, not carried on the entry itself.
 */
export interface AssetEditorEntry {
    kind: AssetKind;
    /** Stable id across renders. For files this is the asset id. */
    id: string;
    name: string;
    /** Optional secondary tags rendered in the tree row. */
    tags?: string[];
    /** Owner user id — used for edit-permission gating. */
    ownerId?: string;
    /**
     * True when the user cannot edit this asset (foreign-owned behavior or
     * file asset). The shell forces Monaco into readOnly mode for these.
     */
    isReadOnly?: boolean;
}

/**
 * Composite key used in the cross-kind dirty map. Keeping kind + id prevents
 * collisions between a behavior and a lambda that coincidentally share an id.
 */
export type AssetKey = `${AssetKind}:${string}`;

export const toAssetKey = (kind: AssetKind, id: string): AssetKey => `${kind}:${id}`;

/**
 * Selection payload used at open time. Each entry point differs only in which
 * asset is preselected on open.
 */
export interface InitialSelection {
    kind: AssetKind;
    id: string;
    /** Optional line to scroll to once the Monaco model is attached. */
    lineNumber?: number;
    /** If set, immediately open the creation dialog for this asset kind on mount. */
    createKind?: "behavior" | "lambda" | "script";
}

export interface CodeEditorProps {
    initialSelection?: InitialSelection;
    onClose: () => void;
    onPopOut?: (payload?: CodeEditorPopoutPayload) => void;
    onPin?: () => void;
    isPinned?: boolean;
    onDirtyChange?: (dirty: boolean) => void;
    /** Called from a popout window to restore the editor inline in the main window. */
    onRestoreInline?: () => void;
}

/**
 * Payload passed to the popout window so it can restore the same selection
 * and in-memory drafts the user was editing.
 */
export interface CodeEditorPopoutPayload {
    initialSelection?: InitialSelection;
    // Drafts are carried over opaquely — each kind delegate knows how to
    // hydrate its own portion (e.g. ModifiedBehavior map for behaviors).
    initialDraftsByKind?: Partial<Record<AssetKind, unknown>>;
}
