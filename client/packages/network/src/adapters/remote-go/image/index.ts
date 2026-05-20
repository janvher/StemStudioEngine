import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

export interface ImageDownloadResponse {
    Code: number;
    Msg: string;
    Path: string;
}

/**
 *
 * @param imageId
 * @param callback
 */
export function downloadImage(
    imageId: string,
    callback?: (data: ImageDownloadResponse) => void,
): Promise<ImageDownloadResponse> {
    return Ajax.post({
        url: backendUrlFromPath(`/api/Image/Download`),
        data: { ID: imageId },
        msgBodyType: "urlEncoded",
    })
        .then(response => {
            const data = response?.data as ImageDownloadResponse;
            callback && callback(data);
            return data;
        })
        .catch(error => {
            console.warn("Image download request failed.", error);
            const errorResponse: ImageDownloadResponse = {
                Code: 500,
                Msg: "Image download failed",
                Path: "",
            };
            callback && callback(errorResponse);
            return errorResponse;
        });
}