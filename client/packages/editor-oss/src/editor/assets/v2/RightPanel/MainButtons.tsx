import styled from "styled-components";

import { StyledButton } from "../common/StyledButton";
import { Separator } from "./common/Separator";

interface MainButtonsProps {
    showModelAnimationCombiner: () => void;
}

export const MainButtons = ({ showModelAnimationCombiner }: MainButtonsProps) => {
    return (
        <Wrapper>
            <StyledButton onClick={showModelAnimationCombiner}
                isBlue
                margin="8px 0 0 0"
            >
                3D Model Editor
            </StyledButton>
        </Wrapper>
    );
};

interface EditorButtonProps {
    showEditor: () => void;
    label: string;
}

export const EditorButton = ({ showEditor, label }: EditorButtonProps) => {
    return (
        <Wrapper className="editorButton">
            <Separator margin="-8px 0 12px"
                invisible
            />
            <StyledButton onClick={showEditor}
                isBlue
            >
                {label}
            </StyledButton>
        </Wrapper>
    );
};

export const SaveButton = ({
    onClick,
    label,
    handleCancel,
}: {
    onClick: () => void;
    handleCancel?: () => void;
    label?: string;
}) => {
    return (
        <StickyWrapper>
            <StyledButton onClick={onClick}
                isBlue
                margin="16px 0 0 0"
            >
                {label || "Save"}
            </StyledButton>
            {handleCancel && 
                <StyledButton onClick={handleCancel}
                    isGrey
                    margin="8px 0 0 0"
                >
                    Cancel
                </StyledButton>
            }
        </StickyWrapper>
    );
};

const StickyWrapper = styled.div`
    position: sticky;
    bottom: 12px;
    left: 0;
    right: 0;
    z-index: 1;
    width: 100%;
`;

const Wrapper = styled.div`
    width: 100%;
`;
