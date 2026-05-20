import {AssetType} from "@stem/network/api/asset";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {useCreateAssetWithData, useCreateAssetRevisionWithData} from "../../asset-management/hooks/assets";

export type CreateAudioParams = {
    name: string;
    file: File;
};

export const useCreateAudio = () => {
    const createAssetWithData = useCreateAssetWithData();
    const {setAssetRevision} = useAssetResolutionContext();

    return async ({name, file}: CreateAudioParams) => {
        const asset = await createAssetWithData.mutateAsync({
            type: AssetType.Audio,
            name,
            data: file,
            format: file.name.split(".").pop()?.toLowerCase() || "",
            contentType: file.type,
        });

        if (asset?.id && asset?.headRevisionId) {
            setAssetRevision(asset.id, asset.headRevisionId);
        }

        return {
            assetId: asset.id,
            revisionId: asset.headRevisionId,
        };
    };
};

export type CreateAudioRevisionParams = {
    id: string;
    parentRevisionId: string;
    file: File;
};

export const useCreateAudioRevision = () => {
    const createAssetRevisionWithData = useCreateAssetRevisionWithData();
    const {setAssetRevision} = useAssetResolutionContext();

    return async ({id, parentRevisionId, file}: CreateAudioRevisionParams) => {
        const revision = await createAssetRevisionWithData.mutateAsync({
            assetId: id,
            parentRevisionId,
            data: file,
            format: file.name.split(".").pop()?.toLowerCase() || "",
            contentType: file.type,
        });

        setAssetRevision(revision.assetId, revision.id);

        return {
            assetId: revision.assetId,
            revisionId: revision.id,
        };
    };
};
