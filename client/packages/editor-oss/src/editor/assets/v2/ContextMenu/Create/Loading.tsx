import React from "react";

import {LoadingHeader, LoadingDescription, LoadingItem} from "../ContextMenu.styles";
import elipse from "../icons/elipse.svg";
import loadingIcon from "../icons/loading-icon.svg";
type LoadingProps = {
    loadingDescription: string;
};

export const Loading: React.FC<LoadingProps> = ({loadingDescription}) => {
    return (
        <>
            <LoadingHeader>
                <img src={loadingIcon}
                    alt="loading"
                />
                AI Builder is working on:
            </LoadingHeader>
            <LoadingDescription>
                <LoadingItem>
                    <img src={elipse}
                        alt="elipse"
                    />
                    {loadingDescription}
                </LoadingItem>
            </LoadingDescription>
        </>
    );
};
