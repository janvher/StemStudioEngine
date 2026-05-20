import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

export interface AnimationDownloadResponse {
    Code: number;
    Msg: string;
    Path: string;
}

/**
 * Download an animation by ID using the legacy Animation API.
 * @deprecated Use the new Asset API instead. This function will be removed in a future release.
 * Use getAsset() and getAssetRevision() from '../api/asset' for animation downloads.
 * @param animationId The animation ID
 * @param callback Optional callback for the response
 */
export function downloadAnimation(
    animationId: string,
    callback?: (data: AnimationDownloadResponse) => void,
): Promise<AnimationDownloadResponse> {
    console.warn("[DEPRECATED] downloadAnimation() is deprecated. Use Asset API instead.");
    return Ajax.post({
        url: backendUrlFromPath(`/api/Animation/Download`),
        data: { ID: animationId },
        msgBodyType: "urlEncoded",
    })
        .then(response => {
            const data = response?.data as AnimationDownloadResponse;
            if (callback) callback(data);
            return data;
        })
        .catch(error => {
            console.warn("Animation download request failed.", error);
            const errorResponse: AnimationDownloadResponse = {
                Code: 500,
                Msg: "Animation download failed",
                Path: "",
            };
            if (callback) callback(errorResponse);
            return errorResponse;
        });
}