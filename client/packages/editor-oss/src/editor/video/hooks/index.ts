import {AssetType} from "@stem/network/api/asset";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {useCreateAssetWithData, useCreateAssetRevisionWithData} from "../../asset-management/hooks/assets";

export type CreateVideoParams = {
    name: string;
    file: File;
};

export const useCreateVideo = () => {
    const createAssetWithData = useCreateAssetWithData();
    const {setAssetRevision} = useAssetResolutionContext();

    return async ({name, file}: CreateVideoParams) => {
        const asset = await createAssetWithData.mutateAsync({
            type: AssetType.Video,
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

export type CreateVideoRevisionParams = {
    id: string;
    parentRevisionId: string;
    file: File;
};

export const useCreateVideoRevision = () => {
    const createAssetRevisionWithData = useCreateAssetRevisionWithData();
    const {setAssetRevision} = useAssetResolutionContext();

    return async ({id, parentRevisionId, file}: CreateVideoRevisionParams) => {
        const revision = await createAssetRevisionWithData.mutateAsync({
            assetId: id,
            parentRevisionId,
            data: file,
            contentType: file.type,
            format: "",
        });

        setAssetRevision(revision.assetId, revision.id);

        return {
            assetId: revision.assetId,
            revisionId: revision.id,
        };
    };
};
