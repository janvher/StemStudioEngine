import styled from "styled-components";

import { StyledRowWrapper } from "./StyledRowWrapper";
import { flexCenter } from "../../../../../assets/style";

interface Props {
    label: string;
    callback: () => void;
}

export const PlusRow = ({ label, callback }: Props) => {
    return (
        <StyledRowWrapper $margin="0">
            <span className="text">{label}</span>
            <PlusButton className="reset-css"
                onClick={callback}
            >
                <span> +</span>
            </PlusButton>
        </StyledRowWrapper>
    );
};

const PlusButton = styled.button`
    width: 16px;
    height: 16px !important;
    padding: 0 !important;
    border-radius: 4px;
    background: var(--theme-grey-bg) !important;
    ${flexCenter}
    span {
        font-size: 12px;
        line-height: 100%;
        color: var(--theme-font-unselected-tertiary-color);
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
`;
