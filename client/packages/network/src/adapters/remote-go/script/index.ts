import {GetAssetRevisionDataOptions, getAssetRevisionData} from "../asset";

export interface ScriptBackendData {
    code: string;
}

export const getScriptRevisionData = async (
    id: string,
    revisionId: string,
    options?: GetAssetRevisionDataOptions,
): Promise<ScriptBackendData> => {
    const data = await getAssetRevisionData(id, revisionId, "json", options);
    return {
        code: data.code,
    };
};
