import React from "react";

import {LoadingIcon, Wrapper} from "./BehaviorEditor.style";
import loadingIcon from "./icons/loading-icon.svg";

type LoadingProps = {
    loadingDescription: string;
};

export const Loading: React.FC<LoadingProps> = ({loadingDescription}) => {
    return (
        <Wrapper>
            <LoadingIcon src={loadingIcon}
                alt="loading"
            />
            {loadingDescription}
        </Wrapper>
    );
};
