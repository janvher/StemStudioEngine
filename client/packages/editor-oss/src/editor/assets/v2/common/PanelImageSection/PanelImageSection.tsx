import React from "react";
import styled from "styled-components";

interface Props {
    bgImg: string;
    isDefaultIcon: boolean;
    children?: React.ReactNode;
}

export const PanelImageSection = ({bgImg, isDefaultIcon, children}: Props) => {
    return (
        <DefaultImageWrapper $bgImg={bgImg}
            $defaultIcon={isDefaultIcon}
        >
            {children}
        </DefaultImageWrapper>
    );
};

// 6
const DefaultImageWrapper = styled.div<{$bgImg: string; $defaultIcon?: boolean}>`
    flex-shrink: 0;
    position: relative;
    width: 100%;
    height: 264px;
    border-radius: 16px 16px 0 0;
    background-color: var(--theme-grey-bg);
    border-radius: 16px 16px 0 0;

    &::before {
        content: "";
        position: absolute;
        top: 16px;
        left: 16px;
        right: 16px;
        bottom: 16px;
        background-image: url("${({$bgImg}) => $bgImg}");
        background-size: ${({$defaultIcon}) => $defaultIcon ? "40%" : "cover"};
        background-position: center;
        background-repeat: no-repeat;
        border-radius: 16px 16px 0 0;
    }
`;
