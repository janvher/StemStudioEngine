import {AssetType} from "@stem/network/api/asset";
import {useCreateAssetWithData} from "../../asset-management/hooks/assets";

export const parseMaterialAssetIdWithRevision = (value: string): {assetId: string} | null => {
    if (!value) return null;

    const match = value.match(/^([a-f0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (!match) return null;

    return {
        assetId: match[1] || "",
    };
};

type CreateImageParams = {
    name: string;
    file: File;
};

export const useCreateImage = () => {
    const createAssetWithData = useCreateAssetWithData();

    return async ({name, file}: CreateImageParams) => {
        const asset = await createAssetWithData.mutateAsync({
            type: AssetType.Image,
            name,
            data: file,
            format: file.name.split(".").pop()?.toLowerCase() || "",
            contentType: file.type,
        });

        return {
            assetId: asset.id,
            revisionId: asset.headRevisionId,
        };
    };
};
