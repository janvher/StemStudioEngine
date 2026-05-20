import styled from "styled-components";

import {SceneItemProps} from "./SceneDetailsPopup";
import {createTrackedShareUrl} from "@stem/network/api/rewards";
import {flexCenter} from "../../../../../assets/style";
import {showToast} from "@stem/editor-oss/showToast";
import {DetectDevice} from "@stem/editor-oss/utils/DetectDevice";
import {getGameUrl} from "../../../../../v2/pages/links";
import shareIcon from "../icons/share.svg";

const ShareButton = styled.button`
    ${flexCenter};
`;

export const ShareScene = ({scene}: Pick<SceneItemProps, "scene">) => {
    const handleShare = async () => {
        if (!scene.IsPublished) {
            showToast({type: "error", title: "Publish your game first to share a play link"});
            return;
        }

        const gameUrl = getGameUrl(scene.ID, null);

        try {
            const trackedUrl = await createTrackedShareUrl(scene.ID, gameUrl, {
                creatorUserId: scene.UserID,
                channel: DetectDevice.isMobile() ? "native_share" : "dashboard_list",
            });

            if (DetectDevice.isMobile() && navigator.share) {
                await navigator.share({
                    title: scene.Name,
                    url: trackedUrl,
                });
                return;
            }

                await navigator.clipboard.writeText(trackedUrl);
                showToast({type: "success", title: "Copied to clipboard!"});
        } catch (err) {
            console.error("Share failed:", err);
            showToast({type: "error", title: "Unable to share"});
        }
    };

    return (
        <ShareButton
            onClick={handleShare}
            className="reset-css shareButton"
        >
            <img
                src={shareIcon}
                alt=""
            />
        </ShareButton>
    );
};
