import React, {useEffect, useMemo, useRef, useState} from "react";

import {useAuthorizationContext} from ".";
import {Asset, ModelFormat} from "@stem/network/api/asset";
import {ImportableAsset} from "../editor/assets/v2/AssetsLibrary/FoldersView/hooks";
import {AUDIO_SUPPORTED_FILETYPES, TABS} from "../editor/assets/v2/AssetsLibrary/types";
import {getComboboxItem, Item} from "../editor/assets/v2/common/BasicCombobox/BasicComboboxNoPortal";
import {FileData} from "../editor/assets/v2/types/file";
import i18n from "../i18n/config";

export enum FILTER_KEYS {
    SORT = "sort",
    TAGS = "tags",
    FORMAT = "format",
    OWNER = "owner",
}

export enum FOLDERS {
    STEMS = "Stems",
    ASSETS_3D = "Models",
    VFX = "VFX",
    MEDIA = "Media",
    BEHAVIORS = "Behaviors",
    SCRIPTS = "Scripts",
    FILES = "Files",
}

const getFormatOptions = (tab: string, folder: string | undefined) => {
    const audioFormats = AUDIO_SUPPORTED_FILETYPES.split(",").map(f => f.trim().toUpperCase());

    if (tab === TABS.MEDIA) {
        return ["All", ...audioFormats, "m4a", "PNG", "GIF", "JPEG", "AVI", "WEBP"];
    }

    if (tab === TABS.MODELS) {
        return ["All", ...Object.values(ModelFormat).map(f => f.toUpperCase())];
    }

    if (folder === FOLDERS.MEDIA) {
        return ["All", ...audioFormats, "PNG", "GIF", "JPEG", "AVI", "WEBP"];
    }

    if (folder === FOLDERS.ASSETS_3D) {
        return ["All", ...Object.values(ModelFormat).map(f => f.toUpperCase())];
    }

    return ["All"];
};

export type AssetStateType = ImportableAsset | Asset;

interface LibrariesContextValue {
    activeTab: TABS;
    setActiveTab: React.Dispatch<React.SetStateAction<TABS>>;
    activeSceneLibrary: FileData | undefined;
    setActiveSceneLibrary: React.Dispatch<React.SetStateAction<FileData | undefined>>;
    currentLibrarySceneList: FileData[];
    setCurrentLibrarySceneList: React.Dispatch<React.SetStateAction<FileData[]>>;
    search: string;
    setSearch: React.Dispatch<React.SetStateAction<string>>;
    activeFolder: FOLDERS | undefined;
    setActiveFolder: React.Dispatch<React.SetStateAction<FOLDERS | undefined>>;
    currentAssets: AssetStateType[];
    setCurrentAssets: React.Dispatch<React.SetStateAction<AssetStateType[]>>;
    assetsToAdd: AssetStateType[];
    setAssetsToAdd: React.Dispatch<React.SetStateAction<AssetStateType[]>>;
    allAssetsSelected: boolean;
    setAllAssetsSelected: React.Dispatch<React.SetStateAction<boolean>>;
    filterValues: Item[];
    setFilterValues: React.Dispatch<React.SetStateAction<Item[]>>;
    visibleFilters: {
        label: string;
        options: Item[];
    }[];
    filteredAndSortedAssets: AssetStateType[];
    filteredAndSortedScenes: FileData[];
    page: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    isSceneTab: boolean;
    libraryContainerRef: React.RefObject<HTMLDivElement | null>;
    showTagsFilter: boolean;
    tagSearch: string;
    setTagSearch: React.Dispatch<React.SetStateAction<string>>;
}

export const LibrariesContext = React.createContext<LibrariesContextValue>(null!);

export interface LibrariesContextProviderProps {
    children: React.ReactNode;
}

const LibrariesContextProvider: React.FC<LibrariesContextProviderProps> = ({children}) => {
    const {dbUser} = useAuthorizationContext();
    const currentUserId = dbUser?.id;

    const [activeTab, setActiveTab] = useState<TABS>(TABS.Projects);
    const [activeSceneLibrary, setActiveSceneLibrary] = useState<FileData | undefined>();
    const [activeFolder, setActiveFolder] = useState<FOLDERS | undefined>();
    const [currentLibrarySceneList, setCurrentLibrarySceneList] = useState<FileData[]>([]);
    const [currentAssets, setCurrentAssets] = useState<AssetStateType[]>([]);
    const [assetsToAdd, setAssetsToAdd] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [showTagsFilter, setShowTagsFilter] = useState(false);
    const [tagSearch, setTagSearch] = useState("");
    const [allAssetsSelected, setAllAssetsSelected] = useState(false);
    const libraryContainerRef = useRef<HTMLDivElement | null>(null);
    const scenesTab = activeTab === TABS.ASSET_PACK || activeTab === TABS.Projects;
    const isSceneTab = scenesTab && !activeFolder;

    const filterConfigs = useMemo(() => {
        const sortFilter = {
            label: i18n.t("Sort By"),
            options: getComboboxItem(["Relevance", "New", "Old", "A-Z", "Z-A"], FILTER_KEYS.SORT),
        };
        const ownerFilter = {
            label: i18n.t("Owner"),
            options: getComboboxItem(["All", "Mine"], FILTER_KEYS.OWNER),
        };
        const formatFilter = {
            label: "Format",
            options: getComboboxItem(getFormatOptions(activeTab, activeFolder), FILTER_KEYS.FORMAT),
        };

        const shouldIncludeFormatFilter =
            activeFolder === FOLDERS.MEDIA ||
            activeFolder === FOLDERS.ASSETS_3D ||
            activeTab === TABS.MEDIA ||
            activeTab === TABS.MODELS;

        let filters = [sortFilter];

        if (scenesTab && !activeFolder) {
            setShowTagsFilter(false);
            setTagSearch("");
            return filters;
        }

        filters.push(ownerFilter);
        setShowTagsFilter(true);

        if (shouldIncludeFormatFilter) {
            filters.push(formatFilter);
        }

        return filters;
    }, [activeTab, activeFolder]);

    const visibleFilters = useMemo(() => {
        return filterConfigs;
    }, [activeTab, activeFolder]);

    const [filterValues, setFilterValues] = useState<Item[]>(visibleFilters.map(f => f.options[0]!));

    const matchesFilters = (asset: AssetStateType) => {
        // Search
        if (search && !asset.name.toLowerCase().includes(search.toLowerCase())) return false;

        // Filter by format
        const formatFilter = filterValues.find(f => f.key === FILTER_KEYS.FORMAT)?.value;
        if (
            formatFilter &&
            formatFilter !== "All" &&
            asset.format.toLowerCase() !== formatFilter.toLowerCase().replace(".", "")
        ) {
            return false;
        }

        // Owner
        const ownerFilter = filterValues.find(f => f.key === FILTER_KEYS.OWNER)?.value;
        if (ownerFilter) {
            if (ownerFilter === "Mine" && asset.userId !== currentUserId) return false;
            // if (ownerFilter === "Shared with Me" && asset... === currentUserId) return false;
        }

        return true;
    };

    const filteredAndSortedAssets = useMemo(() => {
        let assetsFiltered = currentAssets.filter(el => matchesFilters(el));

        const sortBy = filterValues.find(f => f.key === FILTER_KEYS.SORT)?.value;

        switch (sortBy) {
            case "New":
                assetsFiltered.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
                break;
            case "Old":
                assetsFiltered.sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());
                break;
            case "A-Z":
                assetsFiltered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "Z-A":
                assetsFiltered.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case "Relevance":
            default:
                break;
        }

        return assetsFiltered;
    }, [currentAssets, filterValues, search, activeTab, tagSearch]);

    const filteredAndSortedScenes = useMemo(() => {
        let assetsFiltered = currentLibrarySceneList;

        const sortBy = filterValues.find(f => f.key === FILTER_KEYS.SORT)?.value;

        switch (sortBy) {
            case "New":
                assetsFiltered.sort((a, b) => new Date(b.UpdateTime).getTime() - new Date(a.UpdateTime).getTime());
                break;
            case "Old":
                assetsFiltered.sort((a, b) => new Date(a.UpdateTime).getTime() - new Date(b.UpdateTime).getTime());
                break;
            case "A-Z":
                assetsFiltered.sort((a, b) => a.Name.localeCompare(b.Name));
                break;
            case "Z-A":
                assetsFiltered.sort((a, b) => b.Name.localeCompare(a.Name));
                break;
            case "Relevance":
            default:
                break;
        }

        if (!search) {
            return assetsFiltered;
        } else {
            const data = assetsFiltered?.filter(n => {
                return n.Name.toLowerCase().indexOf(search.toLowerCase()) > -1;
            });
            return data;
        }
    }, [currentLibrarySceneList, filterValues, search, activeTab]);

    useEffect(() => {
        setFilterValues(visibleFilters.map(f => f.options[0]!));
    }, [visibleFilters]);

    return (
        <LibrariesContext.Provider
            value={{
                activeTab,
                setActiveTab,
                activeSceneLibrary,
                setActiveSceneLibrary,
                currentLibrarySceneList,
                setCurrentLibrarySceneList,
                search,
                setSearch,
                activeFolder,
                setActiveFolder,
                currentAssets,
                setCurrentAssets,
                assetsToAdd,
                setAssetsToAdd,
                allAssetsSelected,
                setAllAssetsSelected,
                filterValues,
                setFilterValues,
                visibleFilters,
                filteredAndSortedAssets,
                filteredAndSortedScenes,
                page,
                setPage,
                isSceneTab,
                libraryContainerRef,
                showTagsFilter,
                tagSearch,
                setTagSearch,
            }}
        >
            {children}
        </LibrariesContext.Provider>
    );
};

export default LibrariesContextProvider;
