import React from "react";
import styled from "styled-components";

import {UploadButton} from "./UploadButton";
import plusIcon from "../../icons/plus-icon.svg";

const Section = styled.div`
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;

    padding: 8px;
    gap: 8px;
    box-sizing: border-box;
`;

const StyledUploadButton = styled.div`
    width: 100%;
    height: 32px;
    padding: 8px;
    background-color: var(--theme-grey-bg);

    display: flex;
    align-items: center;
    justify-content: space-between;

    transition: all 0.2s ease-in-out;

    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: var(--theme-font-unselected-tertiary-color);

    border-radius: 8px;
    outline: none;
    cursor: pointer;

    &:hover {
        background-color: var(--theme-container-main-blue);
        color: white;
    }

    img {
        width: 16px;
        height: 16px;
    }
`;

interface UploadSectionProps {
    onAnimationUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({onAnimationUpload}) => {
    const [fileName, setFileName] = React.useState("");

    const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        onAnimationUpload(event);
        setFileName(event.target.files?.[0]?.name ?? "");
    };

    const handleUploadClicked = () => {
        document.getElementById("uploadAnimationBtn")?.click();
    };

    return (
        <Section>
            <StyledUploadButton onClick={handleUploadClicked}>
                Import Mixamo Animation <img src={plusIcon}
                    alt=""
                                        />
            </StyledUploadButton>
            <div style={{display: "none"}}>
                <UploadButton
                    buttonID="uploadAnimationBtn"
                    fileName={fileName}
                    onUpload={handleUpload}
                    multiple
                    accept=".fbx,.glb"
                />
            </div>
        </Section>
    );
};
