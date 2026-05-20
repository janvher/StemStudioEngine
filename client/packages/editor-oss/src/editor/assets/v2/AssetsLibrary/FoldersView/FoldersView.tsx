import {useEffect, useState} from "react";

import {getFolderAssetCounts} from "./folderAssetTypes";
import {
    FolderCount,
    FolderIconWrapper,
    FoldersList,
    FolderItemWrapper,
    UnavailableBadge,
} from "./FoldersView.style";
import {useListImportableSceneAssets} from "./hooks";
import {useLibrariesContext} from "@stem/editor-oss/context";
import {FOLDERS} from "@stem/editor-oss/context/LibrariesContext";
import {EmptyListMessage} from "../AssetsLibrary.style";
import folderIcon from "./icons/folder.svg";

const formatFolderCount = (count: number | undefined) => {
    if (count === undefined) return "";
    return `${count} ${count === 1 ? "asset" : "assets"}`;
};

export const FoldersView = () => {
    const {activeSceneLibrary, setActiveFolder, search} = useLibrariesContext();
    const [filteredData, setFilteredData] = useState<FOLDERS[]>([]);
    const {assets, isLoading} = useListImportableSceneAssets(activeSceneLibrary?.ID || "missing-scene-id", {
        includeThumbnails: true,
        enabled: Boolean(activeSceneLibrary?.ID),
    });
    const folderCounts = getFolderAssetCounts(assets);

    useEffect(() => {
        const folders = Array.from(Object.values(FOLDERS));
        if (!search) {
            setFilteredData(folders);
            return;
        } else {
            const data = folders?.filter(n => {
                return n.toLowerCase().indexOf(search.toLowerCase()) > -1;
            });

            setFilteredData(data);
        }
    }, [search]);

    if (filteredData.length === 0) return <EmptyListMessage>No folders found.</EmptyListMessage>;

    return (
        <FoldersList>
            {filteredData.map(label => {
                const count = isLoading ? undefined : folderCounts[label] || 0;
                const isDisabled = !isLoading && count === 0;

                return (
                    <FolderItemWrapper
                        className="reset-css"
                        onClick={() => {
                            if (!isDisabled) {
                                setActiveFolder(label);
                            }
                        }}
                        key={label}
                        $disabled={isDisabled}
                        aria-disabled={isDisabled}
                    >
                        <FolderIconWrapper>
                            <img
                                className="folderIcon"
                                src={folderIcon}
                                alt=""
                            />
                            {isDisabled && <UnavailableBadge aria-hidden="true" />}
                        </FolderIconWrapper>
                        <div className="label">{label}</div>
                        <FolderCount>{formatFolderCount(count)}</FolderCount>
                    </FolderItemWrapper>
                );
            })}
        </FoldersList>
    );
};
