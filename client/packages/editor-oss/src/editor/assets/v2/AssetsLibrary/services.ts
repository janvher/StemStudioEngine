import behaviorIconV2 from "./FoldersView/icons/behavior-icon-v2.svg";
import behaviorIcon from "./FoldersView/icons/behavior-icon.svg";
import {AssetType} from "@stem/network/api/asset";
import {AccessContext} from "@stem/network/api/client";
import {DomainAssetDto,DomainAssetReleaseDto} from "@stem/network/api/client/api";
import {saveScene} from "@stem/network/api/scene";
import {AssetRef} from "@stem/editor-oss/asset-management/AssetRef";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {AssetStateType} from "@stem/editor-oss/context/LibrariesContext";
import {useAddEditorDependencies} from "../../../../editor/asset-management/hooks/assets";
import {useGetBehaviorRevisionData} from "../../../../editor/behaviors/hooks/behaviors";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import Ajax from "@stem/editor-oss/utils/Ajax";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import {IEditorUser} from "../../../../v2/pages/types";
import vfxIcon from "../icons/assetsTab/particles/effect.svg";
import stemIcon from "../icons/assetsTab/prefabs/prefab-placeholder.svg";
import licensedIcon from "../icons/publishStates/licensed.svg";
import privateIcon from "../icons/publishStates/private.svg";
import publishedAuthorIcon from "../icons/publishStates/published-author.svg";
import publishedNonAuthorIcon from "../icons/publishStates/published-non-author.svg";
import unpublishedIcon from "../icons/publishStates/unpublished-fork.svg";
import audioIcon from "../icons/sound.svg";

export const addSoundsToScene = async (ids: string[]) => {
    const app = global.app!;
    const data: any = {
        ID: ids,
        SceneIDToAdd: [app.editor?.sceneID],
    };

    const path = "/api/Audio/UpdateSceneID";
    const response = await Ajax.post({
        url: backendUrlFromPath(path),
        data,
        msgBodyType: "urlEncoded",
    });

    if (response?.data.Code !== 200) {
        showToast({type: "error", title: "Request failed."});
        console.error("Request failed", response?.data.Msg);
    } else {
        app?.call("fetchAudio");
        showToast({type: "success", title: "Asset added to the project."});
    }
};

export const useImportAssets = () => {
    const {context} = useAssetResolutionContext();
    const addEditorDependencies = useAddEditorDependencies();

    const importAssets = async (assetRefs: AssetRef[]) => {
        const newDependencies: Record<string, string> = {};

        assetRefs.forEach(assetRef => {
            // Skip assets that are already in the scene
            if (resolveAssetRevisionId(assetRef.assetId, context)) {
                return;
            }

            newDependencies[assetRef.assetId] = assetRef.revisionId;
        });

        if (Object.keys(newDependencies).length === 0) {
            showToast({type: "warning", title: `Some assets already exist in the project.`});
            return;
        }

        try {
            await addEditorDependencies.mutateAsync(newDependencies);
            showToast({type: "success", title: `Assets added to the project.`});
        } catch (error) {
            showToast({
                type: "error",
                title: `Cannot add asset`,
                body: "Asset is outdated.",
            });
            console.error("[addEditorDependencies]", error);
        }

        return newDependencies;
    };

    return importAssets;
};

export const useImportBehaviors = () => {
    const getBehaviorRevisionData = useGetBehaviorRevisionData();
    const importAssets = useImportAssets();

    const importBehaviors = async (assetRefs: AssetRef[]) => {
        const newDependencies = await importAssets(assetRefs);

        // If there are no new dependencies, we are done
        if (!newDependencies) {
            return;
        }

        // Update behavior registries
        const behaviorConfigRegistry = global.app?.editor?.behaviorConfigRegistry;
        const behaviorScriptRegistry = global.app?.editor?.behaviorScriptRegistry;

        if (!behaviorConfigRegistry || !behaviorScriptRegistry) {
            console.error("Behavior registries not available");
            return;
        }

        for (const [id, revisionId] of Object.entries(newDependencies)) {
            const {config, code} = await getBehaviorRevisionData(id, revisionId);
            if (behaviorConfigRegistry.getConfig(id)) {
                behaviorConfigRegistry.unregisterConfig(id, true);
            }
            if (behaviorScriptRegistry.getScript(id)) {
                behaviorScriptRegistry.unregisterScript(id, true);
            }
            behaviorConfigRegistry.registerConfig(id, config);
            behaviorScriptRegistry.registerScript(id, code);
        }

        await saveScene(false, false);
    };

    return importBehaviors;
};

export const getAssetIcon = (asset: AssetStateType, v2?: boolean) => {
    switch (asset.type) {
        case AssetType.Audio:
            return audioIcon;
        case AssetType.Behavior:
            return v2 ? behaviorIconV2 : behaviorIcon;
        case AssetType.Script:
            return v2 ? behaviorIconV2 : behaviorIcon;
        case AssetType.Image:
            return (asset as any).thumbnailUrl;
        case AssetType.Model:
            return (asset as any).thumbnailUrl;
        case AssetType.Prefab:
            return stemIcon;
        case AssetType.Quarks:
            return vfxIcon;

        default:
            return undefined;
    }
};

export const isAssetWithThumbnail = (asset: AssetStateType) =>
    asset.type === AssetType.Model || asset.type === AssetType.Image;

export const ASSET_API_CLIENT_OPTIONS = {
    context: AccessContext.User,
};

export enum ASSET_STATUS {
    /** This stem can only be used and edited by you */
    PRIVATE,

    /** You may use and fork this stem in this project */
    LICENSED,

    /** Anyone may use and fork this stem */
    PUBLISHED_NON_AUTHOR,

    /** Edits made to this stem may be pushed to the Public Library */
    PUBLISHED_AUTHOR,

    /** You may use and fork this stem, but it is no longer available in the Public Library */
    UNPUBLISHED,
}

const STATE_DETAILS = {
    private: "This stem can only be used and edited by you",
    licensed: "You may use and fork this stem in this project",
    publishedNonAuthor: "Anyone may use and fork this stem",
    publishedAuthor: "Edits made to this stem may be pushed to the Public Library",
    unpublished: "You may use and fork this stem, but it is no longer available in the Public Library",
};

export const STATUS_MAP: Record<ASSET_STATUS, {icon: string; text: string; label: string}> = {
    [ASSET_STATUS.PRIVATE]: {icon: privateIcon, text: STATE_DETAILS.private, label: "Private"},
    [ASSET_STATUS.LICENSED]: {icon: licensedIcon, text: STATE_DETAILS.licensed, label: "Licensed"},
    [ASSET_STATUS.PUBLISHED_AUTHOR]: {
        icon: publishedAuthorIcon,
        text: STATE_DETAILS.publishedAuthor,
        label: "Published",
    },
    [ASSET_STATUS.PUBLISHED_NON_AUTHOR]: {
        icon: publishedNonAuthorIcon,
        text: STATE_DETAILS.publishedNonAuthor,
        label: "Published",
    },
    [ASSET_STATUS.UNPUBLISHED]: {icon: unpublishedIcon, text: STATE_DETAILS.unpublished, label: "Unpublished"},
};

export const getItemStatus: (
    item: DomainAssetDto,
    dbUser: IEditorUser | null,
    isCollaborator: boolean,
) => ASSET_STATUS = (item, dbUser, isCollaborator) => {
    const isAuthor = item.userId === dbUser?.id;

    if (item.latestRelease) {
        return isAuthor ? ASSET_STATUS.PUBLISHED_AUTHOR : ASSET_STATUS.PUBLISHED_NON_AUTHOR;
    } else if (!isAuthor && !item.latestRelease && isCollaborator) {
        return ASSET_STATUS.LICENSED;
    } else if (!item.latestRelease) {
        return isAuthor ? ASSET_STATUS.PRIVATE : ASSET_STATUS.UNPUBLISHED;
    } else return ASSET_STATUS.UNPUBLISHED;
};

export const getDateString = (createTime: string) => {
    return new Date(createTime).toLocaleString("en-US");
};

export const getVersionString = (latestRelease?: DomainAssetReleaseDto) => {
    const version = latestRelease
        ? `v ${latestRelease.versionMajor}.${latestRelease.versionMinor}.${latestRelease.versionPatch}  `
        : "";

    return version;
};
