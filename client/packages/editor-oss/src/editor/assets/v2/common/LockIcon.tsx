import styled from 'styled-components';

import lockIcon from "../icons/lock-icon.svg";

type LockIconProps = React.ImgHTMLAttributes<HTMLImageElement> & {
    locked: boolean;
};

const Img = styled.img<{ $locked: boolean }>`
    cursor: pointer;
    ${({ $locked }) => $locked && `filter: brightness(100);`}
`;

export const LockIcon = ({ locked, ...props }: LockIconProps) =>
    <Img
        src={lockIcon}
        $locked={locked}
        {...props}
    />;
