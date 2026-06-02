import React from "react";

import {AppGlobalContext} from "./AppGlobalContext";
import {AssetsTabContext} from "./AssetsTabContext";
import {AuthorizationContext} from "./AuthorizationContext";
import {HomepageContext} from "./HomepageContext";
import {HUDContext} from "./HUDContext";
import {HUDGameContext} from "./HUDGameContext";
import {HUDInGameMenuContext} from "./HUDInGameMenuContext";
import {HUDStartGameMenuContext} from "./HUDStartGameMenuContext";
import {LibrariesContext} from "./LibrariesContext";
import {LightingContext} from "./LightingContext";
import {ModelAnimationCombinerContext} from "./ModelAnimationCombinerContext";
import {ModelsTabContext} from "./ModelsTabContext";
import {OssAssetRegistryContext} from "./OssAssetRegistryContext";
import {ProjectStateContext} from "./ProjectStateContext";
import {PublishingContext} from "./PublishingContext";
import {UIStateContext} from "./UIStateContext";

export const useLightingContext = () => {
    return React.useContext(LightingContext);
};
export const useAuthorizationContext = () => {
    return React.useContext(AuthorizationContext);
};
export const useHUDContext = () => {
    return React.useContext(HUDContext);
};

export const useHUDStartGameMenuContext = () => {
    return React.useContext(HUDStartGameMenuContext);
};

export const useHUDInGameMenuContext = () => {
    return React.useContext(HUDInGameMenuContext);
};

export const useHUDGameContext = () => {
    return React.useContext(HUDGameContext);
};

export const useHomepageContext = () => {
    return React.useContext(HomepageContext);
};
export const useModelAnimationCombinerContext = () => React.useContext(ModelAnimationCombinerContext);

export const useAppGlobalContext = () => React.useContext(AppGlobalContext);

export const useAssetsTabContext = () => React.useContext(AssetsTabContext);
export const useModelsTabContext = () => React.useContext(ModelsTabContext);
export const useLibrariesContext = () => React.useContext(LibrariesContext);
export const useOssAssetRegistryContext = () => React.useContext(OssAssetRegistryContext);
// Split context hooks for optimized re-renders
// Use these instead of useAppGlobalContext when you only need specific state
export const useUIStateContext = () => React.useContext(UIStateContext);
export const useProjectStateContext = () => React.useContext(ProjectStateContext);
export const usePublishingContext = () => React.useContext(PublishingContext);
