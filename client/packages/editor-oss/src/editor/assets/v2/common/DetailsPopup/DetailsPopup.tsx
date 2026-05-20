import React from "react";

import { Input, Label, Overlay, Popup, PopupItem, PopupItemHeader, Property } from "./DetailsPopup.style";
import i18n from "@stem/editor-oss/i18n/config";
import {useEscapeDismiss} from "../hooks/useEscapeDismiss";
import { StyledButton } from "../StyledButton";
import closeIcon from "../StyledColorPicker/icons/x-mark.svg";
import { StyledTextarea } from "../StyledTextarea";

interface InputData {
    label: string;
    value: string;
    setValue: React.Dispatch<React.SetStateAction<string>>;
    placeholder?: string;
}

interface Props {
    title: string;
    textInputData: InputData;
    textareaData?: InputData;
    saveDisabled?: boolean;
    onSave: () => void;
    customButton?: {
        label: string;
        saveDisabled?: boolean;
        onClick: () => void;
    };
    onCancel: () => void;
    style?: React.CSSProperties;
    saveLabel?: string;
    errorMessage?: string;
}

export const DetailsPopup = ({ title, textInputData, textareaData, saveDisabled, onSave, customButton, onCancel, style, saveLabel, errorMessage }: Props) => {
    useEscapeDismiss({onEscape: onCancel});
    return (
        <Overlay>
            <Popup style={style}>
                <PopupItemHeader $small>
                    {title}
                    <button className="reset-css"
                        onClick={onCancel}
                    >
                        <img src={closeIcon}
                            alt={i18n.t("close")}
                        />
                    </button>
                </PopupItemHeader>
                {textInputData && 
                    <Property>
                        <Label style={{ fontSize: "12px" }}>{textInputData.label}</Label>
                        <Input
                            value={textInputData.value}
                            setValue={textInputData.setValue}
                            placeholder={textInputData.placeholder ?? i18n.t("Enter behavior name")}
                        />
                    </Property>
                }
                {textareaData && 
                    <Property>
                        <Label>{textareaData.label}</Label>
                        <StyledTextarea
                            value={textareaData.value}
                            setValue={value => textareaData.setValue(value)}
                            placeholder={i18n.t("Write a description...")}
                        />
                    </Property>
                }

                {errorMessage && (
                    <PopupItem>
                        <span style={{color: "#ff6b6b", fontSize: "12px"}}>{errorMessage}</span>
                    </PopupItem>
                )}
                <PopupItem $saveButton>
                    <StyledButton isBlue
                        onClick={onSave}
                        disabled={!!saveDisabled}
                    >
                        {saveLabel || i18n.t("Save")}
                    </StyledButton>
                </PopupItem>
                {customButton && 
                    <PopupItem>
                        <StyledButton
                            isGrey
                            onClick={customButton.onClick}
                            disabled={!!customButton.saveDisabled}
                            margin="-16px 0 5px 0"
                        >
                            {customButton.label}
                        </StyledButton>
                    </PopupItem>
                }
            </Popup>
        </Overlay>
    );
};
