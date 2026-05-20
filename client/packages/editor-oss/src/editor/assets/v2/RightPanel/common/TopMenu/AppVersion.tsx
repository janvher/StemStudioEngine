import React, {useRef} from "react";
import styled from "styled-components";
import {useOnClickOutside} from "usehooks-ts";

import {regularFont} from "../../../../../../assets/style";

export const Container = styled.div<{$right?: boolean}>`
    padding: 12px;
    border-radius: 16px;

    position: absolute;
    top: 100%;
    left: 8px;
    margin-top: 4px;

    background: var(--theme-container-main-dark);
    border: 1px solid #ffffff1a;

    ${regularFont("s")}
    white-space: nowrap;
`;

export const AppVersion = ({close}: {close: () => void}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useOnClickOutside(containerRef as React.RefObject<HTMLElement>, close);
    return (
        <Container ref={containerRef}
            $right
        >
            <div>App version: {__APP_VERSION__}</div>
        </Container>
    );
};
