import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import {UploadField} from "../../common/UploadField/UploadField";
import {FileData} from "../../types/file";

interface Props {
    text: string;
    uploadedFile: string | null | FileData;
    setUploadedFile: React.Dispatch<React.SetStateAction<FileData | null | string>>;
}

export const ImageSection = ({text, uploadedFile, setUploadedFile}: Props) => {
    const getUploadedFile = () => {
        if (uploadedFile) {
            const url = backendUrlFromPath(uploadedFile);
            return url || null;
        } else return null;
    };

    return (
        <ImageSectionWrapper>
            <span className="text">{text}</span>
            <UploadField
                width="80px"
                height="80px"
                accept="image/png, image/jpeg, image/gif, image/webp, image/ktx2"
                uploadedFile={getUploadedFile()}
                setUploadedFile={setUploadedFile}
            />
        </ImageSectionWrapper>
    );
};

export const ImageSectionWrapper = styled.div`
    ${flexCenter};
    align-items: flex-start;
    flex-direction: column;
    row-gap: 8px;
    margin-right: auto;
    margin-bottom: 12px;
    .text {
        font-size: var(--theme-font-size-s);
        font-weight: var(--theme-font-regular);
        color: var(--theme-font-unselected-color);
        line-height: 120%;
        text-align: left;
    }
`;
