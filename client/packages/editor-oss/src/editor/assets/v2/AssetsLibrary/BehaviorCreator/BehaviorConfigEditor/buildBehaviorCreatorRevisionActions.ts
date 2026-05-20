import type {RevisionAction} from "../../RevisionSection/RevisionItem";
import type {RevisionActionContext} from "../../RevisionSection/RevisionList";

/**
 * Builds the per-row actions shown on the inline RevisionSection inside the
 * Behavior Creator. Each action is evaluated independently:
 *
 * - **Open in editor** is shown when the row is NOT the editor's current view.
 * - **Apply to scene** is shown when the row is NOT the scene's current
 *   revision (avoiding a no-op apply that would needlessly reinitialize every
 *   behavior instance attached to objects in the scene).
 *
 * Lives in its own file (no React/three.js imports) so the matrix is
 * unit-testable without rendering anything.
 *
 * @param ctx the context for a single revision row from RevisionList
 * @param deps wiring: scene revision id and the two action callbacks
 * @param deps.sceneRevisionId
 * @param deps.onOpenRevisionInEditor
 * @param deps.onApplyRevisionToScene
 * @returns the list of actions to render on this row, in display order
 */
export const buildBehaviorCreatorRevisionActions = (
    ctx: RevisionActionContext,
    deps: {
        sceneRevisionId?: string;
        onOpenRevisionInEditor?: (revisionId: string) => void;
        onApplyRevisionToScene?: (event: React.MouseEvent, revisionId: string) => void;
    },
): RevisionAction[] => {
    const {revision, isCurrent} = ctx;
    const {sceneRevisionId, onOpenRevisionInEditor, onApplyRevisionToScene} = deps;
    const isSceneRevision = revision.id === sceneRevisionId;
    const actions: RevisionAction[] = [];
    if (onOpenRevisionInEditor && !isCurrent) {
        actions.push({
            key: "open",
            tooltip: "Open in editor (scene unchanged)",
            icon: "open",
            onClick: () => onOpenRevisionInEditor(revision.id),
        });
    }
    if (onApplyRevisionToScene && !isSceneRevision) {
        actions.push({
            key: "apply",
            tooltip: "Apply to scene",
            icon: "apply",
            onClick: (event: React.MouseEvent) => onApplyRevisionToScene(event, revision.id),
        });
    }
    return actions;
};
