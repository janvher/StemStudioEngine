import {TABS} from "@web-shared/editor/assets/v2/AssetsLibrary/types";
import {showToast} from "@web-shared/showToast";
import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

type Asset = {
    ID: string;
    Name: string;
    Thumbnail?: string;
    ERTHLibrary?: boolean;
};

export const addAssetToLibrary = async (asset: Asset, options: {libraryType?: TABS; libraryID?: string}) => {
    try {
        const data: Record<string, any> = {
            Asset: JSON.stringify(asset),
        };

        if (options.libraryID) {
            data.LibraryID = options.libraryID;
        } else if (options.libraryType) {
            data.Type = options.libraryType;
        } else {
            console.error("Either libraryType or libraryID must be provided");
            return null;
        }

        const response = await Ajax.post({
            url: backendUrlFromPath("/api/Library/AddAsset"),
            data,
        });

        if (response?.data.Code !== 200) {
            showToast({type: "error", title: "Request failed."});
            console.error("Request failed", response?.data.Msg);
            return null;
        } else {
            showToast({type: "success", title: "Asset added to the library."});
            return response.data.Data;
        }
    } catch (err) {
        showToast({type: "error", title: "Request failed."});
        console.error("Request failed", err);
        return null;
    }
};
