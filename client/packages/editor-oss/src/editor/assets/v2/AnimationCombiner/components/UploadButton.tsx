import React, {useRef} from "react";

import {StyledButton} from "../../common/StyledButton";

interface UploadButtonProps {
    onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    accept?: string;
    fileName?: string;
    buttonID?: string;
}

export const UploadButton: React.FC<UploadButtonProps> = ({
    onUpload,
    multiple = false,
    accept = "",
    fileName = "",
    buttonID = "",
}) => {
    const hiddenFileInput = useRef<HTMLInputElement | null>(null);

    const handleButtonClick = () => {
        hiddenFileInput?.current?.click();
    };

    const getFileNameString = () => {
        if (fileName && fileName.length > 11) {
            return `${fileName.substring(0, 11)}...`;
        } else if (fileName) {
            return fileName;
        } else {
            return "";
        }
    };

    return (
        <div className="file-field input-field ">
            <StyledButton
                id={buttonID}
                isGreyBlue
                onClick={handleButtonClick}
                style={{justifyContent: fileName ? "space-between" : "center", width: "117px", height: "24px"}}
            >
                {getFileNameString()} <span>+</span>
            </StyledButton>
            <input
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={onUpload}
                ref={hiddenFileInput}
                style={{display: "none"}}
            />
        </div>
    );
};
