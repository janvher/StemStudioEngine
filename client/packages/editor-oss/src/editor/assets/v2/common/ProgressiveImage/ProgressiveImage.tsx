import React, {useEffect, useRef, useState} from "react";
import styled, {keyframes} from "styled-components";

const shimmer = keyframes`
    0% { background-position: -800px 0; }
    100% { background-position: 800px 0; }
`;

const Fill = styled.div`
    position: absolute;
    inset: 0;
`;

const Skeleton = styled.div<{$hidden: boolean}>`
    position: absolute;
    inset: 0;
    background-color: rgba(255, 255, 255, 0.03);
    background-image: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.06) 50%,
        rgba(255, 255, 255, 0) 100%
    );
    background-size: 800px 100%;
    background-repeat: no-repeat;
    animation: ${shimmer} 1.4s linear infinite;
    opacity: ${p => (p.$hidden ? 0 : 1)};
    transition: opacity 220ms ease;
    pointer-events: none;
`;

const Img = styled.img<{$loaded: boolean; $objectFit: "cover" | "contain"}>`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: ${p => p.$objectFit};
    object-position: center;
    opacity: ${p => (p.$loaded ? 1 : 0)};
    transition: opacity 280ms ease;
    display: block;
`;

interface Props {
    src?: string | null;
    alt?: string;
    objectFit?: "cover" | "contain";
    onClick?: React.MouseEventHandler<HTMLImageElement>;
}

/**
 * Fills its parent (which must be `position: relative` with a size) with a
 * lazy-loaded image that fades in over a shimmer skeleton. Designed to replace
 * CSS `background-image` thumbnails so off-screen cards skip the fetch until
 * they scroll into view, and on-screen cards don't flash a blank box while the
 * full image decodes.
 *
 * @param root0
 * @param root0.src
 * @param root0.alt
 * @param root0.objectFit
 * @param root0.onClick
 */
export const ProgressiveImage = ({src, alt = "", objectFit = "cover", onClick}: Props) => {
    const [loaded, setLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Reset on src change, then opportunistically mark loaded if the browser
    // already has the image cached (onLoad does not always fire for cache hits
    // when the <img> is reused across renders).
    useEffect(() => {
        setLoaded(false);
        const el = imgRef.current;
        if (el && el.complete && el.naturalWidth > 0) {
            setLoaded(true);
        }
    }, [src]);

    if (!src) {
        return (
            <Fill>
                <Skeleton $hidden={false} />
            </Fill>
        );
    }

    return (
        <Fill>
            <Skeleton $hidden={loaded} />
            <Img
                ref={imgRef}
                src={src}
                alt={alt}
                loading="lazy"
                decoding="async"
                draggable={false}
                $loaded={loaded}
                $objectFit={objectFit}
                onLoad={() => setLoaded(true)}
                onError={() => setLoaded(false)}
                onClick={onClick}
            />
        </Fill>
    );
};
