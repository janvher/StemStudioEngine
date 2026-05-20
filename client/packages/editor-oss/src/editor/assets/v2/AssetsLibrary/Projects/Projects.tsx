import {useEffect, useState} from "react";

import {combineUniqueScenes, fetchAllProjectScenePages, sortScenesByRecentUpdate} from "./projectLibraryData";
import {ProjectsList} from "./ProjectsList/ProjectsList";
import {fetchAssetPacks, fetchCollaborativeScenes, fetchMyScenes} from "@stem/network/api/scene";
import {useLibrariesContext} from "@stem/editor-oss/context";
import {EmptyListMessage} from "../AssetsLibrary.style";
import {TABS} from "../types";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const fetchMyProjects = async () => {
    const fetchOwnedScenes = fetchAllProjectScenePages(fetchMyScenes).catch((error: unknown) => {
        console.error("Fetching my scenes error:", getErrorMessage(error));
        return [];
    });
    const fetchSharedScenes = fetchAllProjectScenePages(fetchCollaborativeScenes).catch((error: unknown) => {
        console.error("Fetching collaborative scenes error:", getErrorMessage(error));
        return [];
    });

    const [myScenes, sharedScenes] = await Promise.all([fetchOwnedScenes, fetchSharedScenes]);

    return sortScenesByRecentUpdate(combineUniqueScenes(myScenes, sharedScenes));
};

const fetchAssetPackData = async () => {
    try {
        const assetPacks = await fetchAllProjectScenePages(fetchAssetPacks);

        return sortScenesByRecentUpdate(assetPacks);
    } catch (error: unknown) {
        console.error("Fetching asset packs error:", getErrorMessage(error));
        return [];
    }
};

export const Projects = () => {
    const {activeTab, setActiveSceneLibrary, setCurrentLibrarySceneList, filteredAndSortedScenes} =
        useLibrariesContext();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let isCurrentRequest = true;

        const loadScenes = async () => {
            setIsLoading(true);
            const scenes =
                activeTab === TABS.ASSET_PACK
                    ? await fetchAssetPackData()
                    : activeTab === TABS.Projects
                      ? await fetchMyProjects()
                      : [];

            if (isCurrentRequest) {
                setCurrentLibrarySceneList(scenes);
                setIsLoading(false);
            }
        };

        void loadScenes();

        return () => {
            isCurrentRequest = false;
        };
    }, [activeTab, setCurrentLibrarySceneList]);

    if (isLoading && filteredAndSortedScenes.length === 0) return <EmptyListMessage>Loading...</EmptyListMessage>;

    if (filteredAndSortedScenes.length === 0)
        return <EmptyListMessage>No assets available. Check back later!</EmptyListMessage>;

    return (
        <ProjectsList
            data={filteredAndSortedScenes}
            onSceneClick={item => setActiveSceneLibrary(item)}
        />
    );
};
