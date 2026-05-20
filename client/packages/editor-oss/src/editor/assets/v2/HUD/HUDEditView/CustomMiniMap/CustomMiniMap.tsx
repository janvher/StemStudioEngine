import {useEffect, useLayoutEffect, useRef, useState, type ReactNode} from "react";
import styled from "styled-components";
import * as THREE from "three";

import global from "@stem/editor-oss/global";
import {IMiniMapInterface} from "../types";

export const Wrapper = styled.div<{
    $customStyle: IMiniMapInterface;
    width: string;
    height: string;
    $maxWidth?: string;
}>`
    position: relative;
    width: ${({width}) => width};
    height: ${({height}) => height};
    max-width: ${({$maxWidth}) => $maxWidth ? $maxWidth : "100%"};
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    border-radius: 12px;
    box-shadow: 0px 4px 15px 0px #000000;
    margin-right: auto;

    ${({$customStyle}) =>
        $customStyle.uploadedMapImg &&
        `
  background-image: url('${$customStyle.uploadedMapImg}');
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center;
  `}

    pointer-events: all;
`;

type Props = {
    customStyle?: IMiniMapInterface;
    width: string;
    height: string;
    maxWidth?: string;
    onClick?: () => void;
    children?: ReactNode;
};

export const CustomMiniMap = ({customStyle, width, height, maxWidth, onClick, children}: Props) => {
    const app = (global as any).app;
    const ref = useRef<HTMLDivElement>(null);
    const [topDownCamera, setTopDownCamera] = useState<THREE.PerspectiveCamera>();
    const [renderer, setRenderer] = useState<THREE.WebGLRenderer>();
    const [isRendered, setIsRendered] = useState<boolean>(false);

    const animate = () => {
        if (topDownCamera && renderer) {
            renderer.clear();
            renderer.render(app.editor.scene, topDownCamera);
            requestAnimationFrame(animate);
        }
    };

    useLayoutEffect(() => {
        if (ref.current && !customStyle?.uploadedMapImg && !isRendered) {
            const renderer = new THREE.WebGLRenderer({antialias: true});
            const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
            camera.position.set(0, 100, 0); // Adjust height for top-down view
            camera.lookAt(0, 0, 0); // Look at the center of the scene
            setIsRendered(true);
            setRenderer(renderer);
            setTopDownCamera(camera);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(ref.current.offsetWidth || 100, ref.current.offsetHeight || 100);
            ref.current.appendChild(renderer.domElement);
        }
    }, [ref.current, customStyle, isRendered]);

    useEffect(() => {
        animate();
    }, [topDownCamera]);

    if (!customStyle) return <div />;

    return (
        <Wrapper
            onClick={onClick}
            $customStyle={customStyle}
            width={width}
            height={height}
            $maxWidth={maxWidth}
            ref={ref}
        >
            {children}
        </Wrapper>
    );
};
