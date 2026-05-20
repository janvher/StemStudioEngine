import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

export interface VideoDownloadResponse {
    Code: number;
    Msg: string;
    Path: string;
}

/**
 *
 * @param videoId
 * @param callback
 */
export function downloadVideo(
    videoId: string,
    callback?: (data: VideoDownloadResponse) => void,
): Promise<VideoDownloadResponse> {
    return Ajax.post({
        url: backendUrlFromPath(`/api/Video/Download`),
        data: { ID: videoId },
        msgBodyType: "urlEncoded",
    })
        .then(response => {
            const data = response?.data as VideoDownloadResponse;
            if (callback) callback(data);
            return data;
        })
        .catch(error => {
            console.warn("Video download request failed.", error);
            const errorResponse: VideoDownloadResponse = {
                Code: 500,
                Msg: "Video download failed",
                Path: "",
            };
            if (callback) callback(errorResponse);
            return errorResponse;
        });
}