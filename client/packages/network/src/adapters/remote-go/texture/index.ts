import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

export interface CubeTextureUrls {
    posX: string;
    negX: string;
    posY: string;
    negY: string;
    posZ: string;
    negZ: string;
}

export interface TextureDownloadResponse {
    Code: number;
    Msg: string;
    Path?: string;
    CubeUrls?: CubeTextureUrls;
}

/**
 *
 * @param textureId
 * @param callback
 */
export function downloadTexture(
    textureId: string,
    callback?: (data: TextureDownloadResponse) => void,
): Promise<TextureDownloadResponse> {
    return Ajax.post({
        url: backendUrlFromPath(`/api/Texture/Download`),
        data: { ID: textureId },
        msgBodyType: "urlEncoded",
    })
        .then(response => {
            const data = response?.data as TextureDownloadResponse;
            if (callback) callback(data);
            return data;
        })
        .catch(error => {
            console.warn("Texture download request failed.", error);
            const errorResponse: TextureDownloadResponse = {
                Code: 500,
                Msg: "Texture download failed",
            };
            if (callback) callback(errorResponse);
            return errorResponse;
        });
}