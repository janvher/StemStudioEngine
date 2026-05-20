import {useMemo} from "react";

import {Wrapper} from "./BehaviorsTab.style";
import {SingleBehavior} from "./SingleBehavior";
import {AssetType} from "@stem/network/api/asset";
import type {Asset} from "@stem/network/api/asset";
import {useListEditorAssets} from "../../../../../../../asset-management/hooks/assets";
import {EmptyAssetsState} from "../EmptyAssetsState";

interface BehaviorsTabProps {
    search: string;
    /** Pre-fetched assets from parent. If provided, skips internal fetch. */
    assets?: Asset[];
}

export const BehaviorsTab = ({search, assets: propAssets}: BehaviorsTabProps) => {
    // Only fetch if assets not provided from parent
    const {data} = useListEditorAssets({
        enabled: !propAssets,
        types: [AssetType.Behavior],
    });

    const assets = useMemo(() => {
        return propAssets ?? data?.assets ?? [];
    }, [propAssets, data]);

    const filtered = useMemo(() => {
        if (!search) return assets;
        return assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    }, [assets, search]);

    if (!filtered || filtered.length === 0) {
        return (
            <EmptyAssetsState
                search={search}
                label="behaviors"
            />
        );
    }

    return (
        <Wrapper>
            {filtered.map(asset => (
                <SingleBehavior
                    key={asset.id}
                    id={asset.id}
                    name={asset.name}
                    description={asset.description}
                    headRevisionId={asset.headRevisionId}
                />
            ))}
        </Wrapper>
    );
};
