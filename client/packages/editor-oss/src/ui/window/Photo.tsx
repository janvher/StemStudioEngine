import React, {forwardRef, MouseEvent} from "react";
import styled from "styled-components";

interface PhotoProps {
    className?: string;
    style?: React.CSSProperties;
    url?: string;
    onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

const StyledPhoto = styled.div`
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

    img {
        max-width: 100%;
        max-height: 100%;
    }
`;

const Photo = forwardRef<HTMLDivElement, PhotoProps>(({className, style, url, onClick}, ref) => {
    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
        if (onClick) {
            onClick(event);
        }
    };

    const handleClickImage = (event: MouseEvent<HTMLImageElement>) => {
        event.stopPropagation();
    };

    return (
        <StyledPhoto ref={ref}
            className={className}
            style={style}
            onClick={handleClick}
        >
            <img src={url}
                onClick={handleClickImage}
            />
        </StyledPhoto>
    );
});

Photo.displayName = "Photo";

export default Photo;
