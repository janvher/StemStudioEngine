import {useEffect, useMemo, useState} from "react";
import styled from "styled-components";

import {EmptyAssetsState} from "./EmptyAssetsState";
import {AssetType} from "@stem/network/api/asset";
import type {Asset} from "@stem/network/api/asset";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {useListEditorAssets} from "../../../../../../asset-management/hooks/assets";
import {StemCard} from "../../../../common/StemCard/StemCard";

interface StemsTabProps {
    search: string;
    /** Pre-fetched assets from parent. If provided, skips internal fetch. */
    assets?: Asset[];
}

export const StemsTab = ({search, assets: propAssets}: StemsTabProps) => {
    const app = global.app as EngineRuntime;
    const [searchStems, setSearchStems] = useState<Asset[]>([]);
    const [queryEnabled, setQueryEnabled] = useState<boolean>(true);

    const {data} = useListEditorAssets({
        types: [AssetType.Prefab],
        enabled: !propAssets && queryEnabled,
        includeLatestRelease: true,
        includeThumbnails: true,
    });

    const stems = useMemo(() => propAssets ?? data?.assets ?? [], [propAssets, data]);

    // Update search results
    useEffect(() => {
        if (!search) {
            setSearchStems(stems);
            return;
        }

        setSearchStems(
            stems?.filter(({name}) => {
                return name.toLowerCase().indexOf(search.toLowerCase()) > -1;
            }) || [],
        );
    }, [search, stems]);

    useEffect(() => {
        app.on("generatingThumbnail.StemsTab", () => setQueryEnabled(false));
        app.on("generatingThumbnailDone.StemsTab", () => setQueryEnabled(true));
        return () => {
            app.on("generatingThumbnail.StemsTab", () => setQueryEnabled(false));
            app.on("generatingThumbnailDone.StemsTab", () => setQueryEnabled(true));
        };
    }, []);

    if (!searchStems || searchStems.length === 0) {
        return (
            <EmptyAssetsState
                search={search}
                label="stems"
            />
        );
    }

    return (
        <List>
            {searchStems.map((item, index) => (
                <StemCard
                    key={`${item.id}${index}`}
                    stem={item}
                />
            ))}
        </List>
    );
};

const List = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    justify-content: space-between;
    align-content: start;
    align-items: flex-start;
    box-sizing: border-box;
    row-gap: 6px;
    column-gap: 8px;
    width: 100%;
    padding-bottom: 12px;

    &::-webkit-scrollbar-track {
        border-radius: 0;
        background: var(--theme-container-secondary-dark);
    }

    &::-webkit-scrollbar-thumb {
        border-radius: 0px;
        background-color: var(--theme-scroll-list-thumb);
    }

    > div:nth-child(even) {
        margin-right: auto;
    }

    > div:nth-child(odd) {
        margin-left: auto;
    }
`;
