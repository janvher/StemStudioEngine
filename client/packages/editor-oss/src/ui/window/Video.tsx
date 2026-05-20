import React, {forwardRef} from "react";
import styled from "styled-components";

interface VideoProps {
    className?: string;
    style?: React.CSSProperties;
    url?: string;
    onClick?: (event: React.MouseEvent<HTMLVideoElement | HTMLDivElement, MouseEvent>) => void;
}

const VideoMark = styled.div`
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1300;
`;

const VideoElement = styled.video`
    max-width: 80%;
`;

const Video = forwardRef<HTMLDivElement, VideoProps>(({className, style, url, onClick}, ref) => {
    const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        onClick && onClick(event);
    };

    const handleClickVideo = (event: React.MouseEvent<HTMLVideoElement, MouseEvent>) => {
        event.stopPropagation();
    };

    return (
        <VideoMark className={className}
            style={style}
            onClick={handleClick}
            ref={ref}
        >
            <VideoElement src={url}
                autoPlay
                controls
                onClick={handleClickVideo}
            />
        </VideoMark>
    );
});

Video.displayName = "Video";

export default Video;
