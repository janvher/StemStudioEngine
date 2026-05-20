import type { ReactNode } from "react";
import styled from "styled-components";

import { IBannerInterface } from "../types";

export const Banner = styled.div<{
    $customStyle: IBannerInterface;
    width: string;
    height: string;
    $maxWidth?: string;
    $clickEnabled?: boolean;
}>`
    position: relative;
    font-family: ${({ $customStyle }) => $customStyle.fontFamily};
    * {
        font-family: "${({ $customStyle }) => $customStyle.fontFamily}";
    }
    font-size: ${({ $customStyle }) => $customStyle.fontSize}px;
    color: ${({ $customStyle }) => $customStyle.fontColor};
    width: ${({ width }) => width};
    height: ${({ height }) => height};
    max-width: ${({ $maxWidth }) => $maxWidth ? $maxWidth : "100%"};
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    pointer-events: ${({ $clickEnabled }) => $clickEnabled ? "all" : "none"};
`;

type Props = {
    customStyle?: IBannerInterface;
    width: string;
    height: string;
    maxWidth?: string;
    text?: string;
    onClick?: () => void;
    children?: ReactNode;
    id: string;
};

export const CustomBanner = ({ customStyle, width, height, maxWidth, text, onClick, children, id }: Props) => {
    let msg = text ? text : customStyle ? customStyle.UITag : "";
    if (!customStyle) return <div />;
    return (
        <Banner
            id={id}
            onClick={onClick}
            $customStyle={customStyle}
            width={width}
            height={height}
            $maxWidth={maxWidth}
            $clickEnabled={!!onClick}
        >
            {msg}
            {children}
        </Banner>
    );
};
