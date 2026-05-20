import BoringAvatar from "boring-avatars";
import {useState} from "react";
import styled from "styled-components";

import {flexCenter} from "../../../../assets/style";

interface Props {
    name?: string;
    image?: string;
    size?: number;
    onClick?: () => void;
}

export const Avatar = ({name, image, size, onClick}: Props) => {
    const [imgError, setImgError] = useState(false);
    return image && !imgError ? (
        <StyledAvatar
            size={size}
            onClick={onClick}
        >
            <StyledImg
                src={image}
                alt={name}
                size={size}
                onError={() => setImgError(true)}
            />
        </StyledAvatar>
    ) : (
        <BoringAvatarWrapper onClick={onClick}>
            <BoringAvatar
                name={name}
                size={size || 45}
                variant="beam"
            />
        </BoringAvatarWrapper>
    );
};

const StyledAvatar = styled.div<{size?: number}>`
    width: ${({size}) => (size ? `${size}px` : "45px")};
    height: ${({size}) => (size ? `${size}px` : "45px")};
    flex-shrink: 0;
    ${flexCenter};
    border-radius: ${({size}) => (size ? `${size}px` : "4px")};
    overflow: hidden;
`;

const StyledImg = styled.img<{size?: number}>`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const BoringAvatarWrapper = styled.div`
    ${flexCenter};
`;
