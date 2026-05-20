import React from "react";

import {StemStudioLoader} from "./StemStudioLoader/StemStudioLoader";
import {useAppGlobalContext} from "../../context";

type Props = {
    style?: React.CSSProperties;
    show?: boolean;
};

export const LoadingAnimation = ({style, show}: Props) => {
    const {mainLoaderState} = useAppGlobalContext();

    return (
        <StemStudioLoader
            show={!!mainLoaderState.visible || !!show}
            style={style}
            isAutoLoading={false}
            hideProgress
            message={mainLoaderState.message}
        />
    );
};
