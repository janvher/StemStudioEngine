import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {AssetType} from "@stem/network/api/asset";
import {useAuthorizationContext, useLibrariesContext} from "@stem/editor-oss/context";
import {useListAssets} from "../../../../../editor/asset-management/hooks/assets";
import global from "@stem/editor-oss/global";
import {EmptyListMessage} from "../AssetsLibrary.style";
import {AssetCard} from "../FoldersView/AssetCard/AssetCard";
import {FoldersList} from "../FoldersView/FoldersView.style";
import {TABS} from "../types";

type AssetTypeValue = (typeof AssetType)[keyof typeof AssetType];

const tabToAssetTypes: Partial<Record<TABS, AssetTypeValue[]>> = {
    [TABS.MODELS]: [AssetType.Model],
    [TABS.MEDIA]: [AssetType.Audio, AssetType.Image],
    [TABS.BEHAVIORS]: [AssetType.Behavior],
    [TABS.STEMS]: [AssetType.Prefab],
    [TABS.VFX]: [AssetType.Quarks],
};

const PAGE_LIMIT = 18;

export const ActiveTabContent = () => {
    const {activeTab, setCurrentAssets, filteredAndSortedAssets, page, setPage, tagSearch} = useLibrariesContext();
    const assetTypes = useMemo(() => tabToAssetTypes[activeTab] || [AssetType.Model], [activeTab]);

    const {dbUser} = useAuthorizationContext();
    const projectUserId = global.app?.editor?.projectUserId || "missing-project-user-id";
    const isProjectOwner = dbUser?.id === projectUserId;
    const [debouncedTag, setDebouncedTag] = useState(tagSearch);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedTag(tagSearch);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [tagSearch]);

    const {data, isLoading} = useListAssets({
        // return all released assets for all users + the user's assets (both released and unreleased)
        owner: "all",
        // if the user is not the project owner, only return released assets
        // because they won't be able to import their unreleased assets into the
        // project
        released: isProjectOwner ? "all" : "true",
        types: assetTypes,
        includeLatestRelease: true,
        includeThumbnails: true,
        page,
        limit: PAGE_LIMIT,
        tags: [debouncedTag],
    });
    const assets = data?.assets || [];
    const totalCount = data?.totalCount || 0;
    const observerRef = useRef<IntersectionObserver | null>(null);
    const bottomNodeRef = useRef<HTMLDivElement | null>(null);
    const filteredAssetsRef = useRef(filteredAndSortedAssets.length);
    const isLoadingRef = useRef(isLoading);
    const totalCountRef = useRef(totalCount);

    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

    useEffect(() => {
        totalCountRef.current = totalCount;
    }, [totalCount]);

    const setBottomRef = useCallback((node: HTMLDivElement | null) => {
        if (!node) return;
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(
            ([entry]) => {
                if (
                    entry?.isIntersecting &&
                    filteredAssetsRef.current < totalCountRef.current &&
                    !isLoadingRef.current
                ) {
                    setPage(prev => {
                        const nextPage = prev + 1;
                        return nextPage;
                    });
                }
            },
            {rootMargin: "50px", threshold: 0.1},
        );

        observerRef.current.observe(node);
    }, []);

    useEffect(() => {
        filteredAssetsRef.current = filteredAndSortedAssets.length;
    }, [filteredAndSortedAssets.length]);

    useEffect(() => {
        const node = bottomNodeRef.current;
        if (!node || !observerRef.current) return;

        observerRef.current.unobserve(node);
        observerRef.current.observe(node);
    }, [filteredAndSortedAssets.length]);

    useEffect(() => {
        if (isLoading) return;
        setTimeout(() => {
            setCurrentAssets(prev => {
                const reset = page === 1;
                const baseAssets = reset ? [] : prev;

                // Build a map of fresh asset data for updating existing entries
                const freshById = new Map(assets.map(a => [a.id, a]));
                // Update existing assets with fresh data, then append truly new ones
                const updatedBase = baseAssets.map(a => (freshById.get(a.id)) ?? a);
                const existingIds = new Set(updatedBase.map(a => a.id));
                const newAssets = assets.filter(a => !existingIds.has(a.id));

                const cleanAssets = [...updatedBase, ...newAssets].filter(a => assetTypes.includes(a.type));
                return cleanAssets;
            });
        }, 100);
    }, [assets, page, activeTab, assetTypes, isLoading]);

    useEffect(() => {
        observerRef.current?.disconnect();
        observerRef.current = null;
        filteredAssetsRef.current = 0;
        setCurrentAssets([]);
        setPage(1);
        return () => {
            observerRef.current?.disconnect();
            observerRef.current = null;
        };
    }, [activeTab]);

    if (filteredAndSortedAssets.length === 0 && !isLoading && page === 1)
        return <EmptyListMessage>No assets available. Check back later!</EmptyListMessage>;

    return (
        <FoldersList>
            {filteredAndSortedAssets.map(asset => 
                <AssetCard key={asset.id}
                    asset={asset}
                />,
            )}
            <div ref={setBottomRef}
                style={{height: "1px"}}
            />
        </FoldersList>
    );
};
