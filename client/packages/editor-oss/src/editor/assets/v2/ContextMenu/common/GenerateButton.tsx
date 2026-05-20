import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";
import aiIcon from "../icons/v2/ai.svg";

interface Props {
    disabled?: boolean;
    onClick: () => void;
}

export const GenerateButton = ({disabled, onClick}: Props) => {
    return (
        <GenerateWithAIButton disabled={!!disabled}
            onClick={onClick}
        >
            <img src={aiIcon}
                alt=""
                className="aiIcon"
            />
            Generate with AI
            <div />
        </GenerateWithAIButton>
    );
};

export const GenerateWithAIButton = styled.button`
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    border: none;
    background: none;
    cursor: pointer;

    width: 100%;
    height: 32px;
    flex-grow: 1;
    border-radius: 16px;
    padding: 8px;
    background: linear-gradient(90deg, #8508fb 0%, #ca35a1 78.94%);
    ${flexCenter};
    justify-content: space-between;

    .aiIcon {
        width: 16px;
    }

    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    text-align: center;
    cursor: pointer;

    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;
