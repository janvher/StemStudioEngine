import styled from "styled-components";

import {flexCenter} from "../../../../assets/style";
import plusIcon from "../../v2/icons/upload.svg";

const Wrapper = styled.div<{$isAdmin?: boolean}>`
    width: 24px;
    height: 24px;
    ${flexCenter};
    transition: all 0.2s;
    border-radius: 8px;
    cursor: pointer;

    ${({$isAdmin}) =>
        $isAdmin &&
        `
        background-color: red;
        &:hover {
            background-color: red;
            border-top: 1px solid red;
        }
    `}
`;

type Props = {
    onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    isAdmin?: boolean;
    "aria-label"?: string;
};

export const UploadButton = ({onClick, isAdmin, "aria-label": ariaLabel}: Props) => {
    return (
        <Wrapper onClick={onClick}
            $isAdmin={isAdmin}
            role="button"
            aria-label={ariaLabel}
        >
            <img src={plusIcon}
                alt="upload-icon-small"
            />
        </Wrapper>
    );
};
