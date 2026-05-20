import {useEffect, useRef} from "react";

import {showToast} from "@stem/editor-oss/showToast";
import {ElementsUtils} from "@stem/editor-oss/utils/ElementsUtils";
import {useChangePrefabRevision} from "../asset-management/hooks/useChangePrefabRevision";

interface Props {
    assetId: string;
    revisionId: string;
    onDone: () => void;
}

/**
 * Headless component that prompts the user to update scene instances of a
 * stem to a newly-saved revision. Renders no UI of its own; the confirmation
 * dialog is shown imperatively via ElementsUtils.confirm.
 *
 * @param props - Component props.
 * @param props.assetId - Asset ID of the stem that was saved.
 * @param props.revisionId - New revision ID to update instances to.
 * @param props.onDone - Called after the user confirms, cancels, or dismisses.
 * @returns null
 */
export const StemUpdatePrompt = ({assetId, revisionId, onDone}: Props) => {
    const changePrefabRevision = useChangePrefabRevision();
    const firedRef = useRef(false);

    useEffect(() => {
        if (firedRef.current) return;
        firedRef.current = true;

        ElementsUtils.confirm({
            title: "Update Stem in Scene",
            content:
                "The stem was saved as a new revision. Update existing instances in this scene to the latest version?",
            okText: "Update",
            cancelText: "Keep Current",
            onOK: async () => {
                try {
                    await changePrefabRevision(assetId, revisionId);
                    showToast({type: "success", title: "Stem instances updated."});
                } catch (err) {
                    showToast({
                        type: "error",
                        title: "Failed to update stem instances.",
                        body: String(err),
                    });
                }
                onDone();
            },
            onCancel: onDone,
            onClose: onDone,
        });
    }, [assetId, revisionId, changePrefabRevision, onDone]);

    return null;
};
