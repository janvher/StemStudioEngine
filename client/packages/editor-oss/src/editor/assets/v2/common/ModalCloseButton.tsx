import React from "react";
import styled from "styled-components";

import closeIcon from "../icons/close-panel.svg";

const Button = styled.button`
    position: absolute;
    right: 16px;
    top: 16px;

    img {
        width: 13px;
        height: auto;
    }
`;

interface ModalCloseButtonProps {
    onClick: () => void;
}

export const ModalCloseButton: React.FC<ModalCloseButtonProps> = ({onClick}) => (
    <Button className="reset-css" onClick={onClick}>
        <img src={closeIcon} alt="close" />
    </Button>
);
