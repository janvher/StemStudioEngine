import arrowIcon from "./icons/arrow-back.svg";
import {ArrowButton, LibraryTopInfo} from "./LibraryNavigation.style";
import {useLibrariesContext} from "@stem/editor-oss/context";

export const LibraryNavigation = () => {
    const {activeFolder, activeSceneLibrary, setActiveFolder, setActiveSceneLibrary} = useLibrariesContext();
    const path = `${activeSceneLibrary?.Name}${activeFolder ? "/" + activeFolder : ""}`;

    const handleGoBack = () => {
        if (activeFolder) {
            setActiveFolder(undefined);
        } else if (activeSceneLibrary) {
            setActiveSceneLibrary(undefined);
        }
    };

    return (
        <LibraryTopInfo>
            <ArrowButton className="reset-css"
                onClick={handleGoBack}
            >
                <img src={arrowIcon}
                    alt="go back"
                />
            </ArrowButton>
            <span className="path">{path}</span>
        </LibraryTopInfo>
    );
};
