import {useEffect, useState} from "react";
import styled, {keyframes} from "styled-components";

import loadingImage from "./icons/loading.png";
import global from "@stem/editor-oss/global";

type Props = {
    uuid: string;
    initialProgress?: number;
};

const Container = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    color: var(--theme-font-main-selected-color);
    font-size: 60px;
    font-weight: var(--theme-font-medium-plus);
    width: 360px;
    height: 360px;
    background: #18181b;
    border-radius: 50%;
`;

const loading = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const Spinner = styled.img`
    animation: ${loading} 1s linear infinite;
    position: absolute;
    width: 240px;
    height: 240px;
    z-index: 999999999999;
`;

export const Indicator = ({uuid, initialProgress = 0}: Props) => {
    const app = global.app as any;
    const [progress, setProgress] = useState(initialProgress);

    useEffect(() => {
        app.on(`updateIndicator.${uuid}`, (data: any) => {
            const dataUuid = data.uuid;
            const progress = data.progress;

            if (dataUuid === uuid) {
                setProgress(progress);
            }
        });
        return () => {
            app.on(`updateIndicator.${uuid}`, null);
        };
    }, [uuid]);

    return (
        <Container>
            <Spinner src={loadingImage}
                alt="loading"
            />
            {Math.round(progress)}%
        </Container>
    );
};
