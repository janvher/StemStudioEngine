export type RemixBannerProps = {
    /**
     * Sentence shown to the left of the Remix button. Should explain in
     * one line why the editor is read-only and what Remix will do. Pass a
     * type-specific copy from each editor (e.g. "this behavior", "this
     * lambda") so the banner reads naturally in context.
     */
    description?: string;
    /**
     * Called when the user clicks "Remix". Should perform the fork-and-swap
     * for this asset; on success the editor switches to the user's fork and
     * unlocks for editing.
     */
    onRemix: () => void;
    /** True while the fork is in flight; disables the button. */
    isRemixing: boolean;
};

const DEFAULT_DESCRIPTION =
    "Read-only — this asset belongs to someone else. Remix to make your own copy and edit it.";

/**
 * Banner shown above an asset editor when the user is viewing an asset
 * they don't own but is allowed to fork (a contributor on a forkable
 * scene). Clicking Remix forks the asset to the user's account, swaps
 * every scene reference to the fork, and unlocks the editor.
 *
 * The button click is the user's explicit consent — there's no separate
 * confirm dialog. The "Remix" label mirrors the scene-level Remix gesture
 * already familiar from the dashboard.
 *
 * @param props see {@link RemixBannerProps}
 * @param props.description
 * @param props.onRemix
 * @param props.isRemixing
 * @returns banner element
 */
export const RemixBanner = ({description = DEFAULT_DESCRIPTION, onRemix, isRemixing}: RemixBannerProps) => {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "8px 12px",
                background: "rgba(96, 165, 250, 0.12)",
                borderBottom: "1px solid rgba(96, 165, 250, 0.4)",
                color: "var(--theme-font-main-selected-color)",
                fontSize: 12,
            }}
        >
            <span>{description}</span>
            <button
                type="button"
                onClick={onRemix}
                disabled={isRemixing}
                style={{
                    padding: "4px 14px",
                    background: "var(--theme-button-blue-bg, #2563eb)",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: isRemixing ? "wait" : "pointer",
                    fontSize: 12,
                    flexShrink: 0,
                    opacity: isRemixing ? 0.6 : 1,
                }}
            >
                {isRemixing ? "Remixing…" : "Remix"}
            </button>
        </div>
    );
};
