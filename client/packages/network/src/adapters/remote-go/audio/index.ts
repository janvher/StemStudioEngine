import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

export interface AudioDownloadResponse {
    Code: number;
    Msg: string;
    Path: string;
}

/**
 *
 * @param audioId
 * @param callback
 */
export function downloadAudio(
    audioId: string,
    callback?: (data: AudioDownloadResponse) => void,
): Promise<AudioDownloadResponse> {
    return Ajax.post({
        url: backendUrlFromPath(`/api/Audio/Download`),
        data: { ID: audioId },
        msgBodyType: "urlEncoded",
    })
        .then(response => {
            const data = response?.data as AudioDownloadResponse;
            if (callback) callback(data);
            return data;
        })
        .catch(error => {
            console.warn("Audio download request failed.", error);
            const errorResponse: AudioDownloadResponse = {
                Code: 500,
                Msg: "Audio download failed",
                Path: "",
            };
            if (callback) callback(errorResponse);
            return errorResponse;
        });
}