import I18n from "i18next";
import React, { useState } from "react";

import uploadIcon from "./icons/upload.svg";
import { CloseIconWrapper, StyledUploadButton } from "./UploadField.style";
import { showToast } from "@stem/editor-oss/showToast";
import { UploadUtils } from "@stem/editor-oss/utils/UploadUtils";
import { backendUrlFromPath } from "@stem/editor-oss/utils/UrlUtils";
import trashIcon from "../../icons/trash.svg";
import { FileData } from "../../types/file";
import { StyledButton } from "../StyledButton";

interface Props {
    width: string;
    height: string;
    uploadedFile?: FileData | null | string;
    setUploadedFile: React.Dispatch<React.SetStateAction<FileData | null | string>>;
    handleFileName?: (name: string) => void;
    disabled?: boolean;
    size?: { minWidth: number; minHeight: number };
    deleteHandler?: () => void;
    style?: React.CSSProperties;
    uploadHandler?: (arg: any) => void;
    withButton?: boolean;
    v2?: boolean;
    savedFileName?: string;
    label?: string;
    accept?: string;
}

export const UploadField = ({
    width,
    height,
    uploadedFile,
    setUploadedFile,
    disabled,
    deleteHandler,
    size = { minWidth: 0, minHeight: 0 },
    uploadHandler,
    style,
    withButton,
    v2,
    label,
    handleFileName,
    accept = "image/png, image/jpeg, image/gif",
}: Props) => {
    const [hover, setHover] = useState(false);

    const removeImage = (e: any) => {
        e.stopPropagation();
        setUploadedFile(null);
        deleteHandler?.();
    };

    const handleAdd = () => {
        void UploadUtils.upload(
            backendUrlFromPath(`/api/Upload`) || "",
            (obj: any) => {
                if (obj.Code === 200) {
                    setUploadedFile(obj.Data.url);
                    uploadHandler?.(obj.Data.url);
                    handleFileName?.(obj.Data.fileName);
                }
                showToast({ type: "info", body: I18n.t(obj.Msg) });
            },
            size,
            accept,
        );
    };

    const renderButton = () => {
        return (
            <StyledButton isGrey
                width="78px"
                style={{ height: "24px" }}
            >
                <img src={uploadIcon} />
                {label || "Upload"}
            </StyledButton>
        );
    };

    return v2 ? 
        <StyledButton isGreySecondary
            width="100%"
            style={{ height: "32px" }}
            onClick={handleAdd}
        >
            <img src={uploadIcon} />
            {label || "Upload"}
        </StyledButton>
     : 
        <StyledUploadButton
            style={style}
            className="uploadButton"
            onClick={handleAdd}
            $bgImage={(uploadedFile as string) || ""}
            width={width}
            height={height}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            $disabled={disabled}
        >
            {withButton ? 
                <>
                    {!uploadedFile && <>{renderButton()}</>}
                    {uploadedFile && hover && <>{renderButton()}</>}
                    {uploadedFile && 
                        <CloseIconWrapper className="closeIconWrapper"
                            onClick={removeImage}
                        >
                            <img src={trashIcon}
                                alt="remove file"
                            />
                        </CloseIconWrapper>
                    }
                </>
             : 
                <>
                    {!uploadedFile && <span className="plus">+</span>}
                    {uploadedFile && 
                        <CloseIconWrapper className="closeIconWrapper"
                            onClick={removeImage}
                        >
                            <img src={trashIcon}
                                alt="remove file"
                            />
                        </CloseIconWrapper>
                    }
                </>
            }
        </StyledUploadButton>
    ;
};
