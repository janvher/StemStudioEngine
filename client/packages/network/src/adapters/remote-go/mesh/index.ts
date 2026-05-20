import global from "@web-shared/global";
import {showToast} from "@web-shared/showToast";
import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

export interface MeshDownloadResponse {
    Code: number;
    Msg: string;
    Path: string;
}

/**
 *
 * @param payload
 * @param payload.ID
 * @param payload.Name
 * @param payload.Image
 * @param payload.Url
 * @param payload.IsAvatar
 * @param callback
 */
export function editModel(
    payload: {
        ID: string;
        Name?: string;
        Image?: string;
        Url?: string;
        IsAvatar?: boolean;
    },
    callback?: (data: any) => void,
) {
    Ajax.post({
        url: backendUrlFromPath(`/api/Mesh/Edit`),
        data: payload,
        msgBodyType: "urlEncoded",
    })
        .then(response => {
            global.app?.call("fetchModels");
            if (response?.data.Code !== 200) {
                showToast({type: "error", body: response?.data.Msg || "Request failed."});
            }
            callback && callback(response?.data);
        })
        .catch(error => {
            console.warn("Request failed.", error);
        });
}

/**
 *
 * @param meshId
 * @param callback
 */
export function downloadMesh(
    meshId: string,
    callback?: (data: MeshDownloadResponse) => void,
): Promise<MeshDownloadResponse> {
    return Ajax.post({
        url: backendUrlFromPath(`/api/Mesh/Download`),
        data: { ID: meshId },
        msgBodyType: "urlEncoded",
    })
        .then(response => {
            const data = response?.data as MeshDownloadResponse;
            callback && callback(data);
            return data;
        })
        .catch(error => {
            console.warn("Mesh download request failed.", error);
            const errorResponse: MeshDownloadResponse = {
                Code: 500,
                Msg: "Mesh download failed",
                Path: "",
            };
            callback && callback(errorResponse);
            return errorResponse;
        });
}
