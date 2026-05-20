import styled from "styled-components";

import plusIcon from "./plus.svg";
import closeIcon from "./x-mark.svg";
import {flexCenter} from "../../../../../assets/style";

interface Props {
    setViewState: (value: React.SetStateAction<boolean>) => void;
    showCloseButton: boolean;
}

export const ObjectViewButton = ({setViewState, showCloseButton}: Props) => {
    return showCloseButton ? 
        <StyledCloseViewButton onClick={() => setViewState(prev => !prev)}>
            <img src={closeIcon}
                alt="close view"
            />
        </StyledCloseViewButton>
     : 
        <StyledOpenViewButton onClick={() => setViewState(prev => !prev)}>
            <img src={plusIcon}
                alt="open view"
            />
        </StyledOpenViewButton>
    ;
};

const StyledCloseViewButton = styled.button`
    width: 32px;
    height: 32px;
    border-radius: 8px;
    padding: 8px;
    border-top-width: 1px;
    background: var(--theme-grey-bg-secondary);
    border: none;
    border-top: 1px solid #353952;
    ${flexCenter};
    cursor: pointer;
`;

const StyledOpenViewButton = styled(StyledCloseViewButton)`
    border-top: 1px solid #0ea5e9;
    background: #0284c7;
`;
