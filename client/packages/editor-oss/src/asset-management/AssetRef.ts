export interface AssetRef {
    assetId: string;
    revisionId: string;
}

export const isAssetRef = (value: unknown): value is AssetRef =>
    typeof value === "object" && !!value && "assetId" in value && "revisionId" in value;

export const assetRefKey = ({ assetId, revisionId }: AssetRef): string => `${assetId}:${revisionId}`;
