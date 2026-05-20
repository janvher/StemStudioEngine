import classNames from "classnames";
import React, {forwardRef} from "react";

import Window from "./Window";
import {StyledButton} from "../../editor/assets/v2/common/StyledButton";
import {Buttons, Content} from "../index";

export interface IConfirmProps {
    className?: string;
    style?: React.CSSProperties;
    title: string;
    children?: React.ReactNode;
    hidden?: boolean;
    mask?: any;
    okText?: string;
    cancelText?: string;
    onOK?: (event: any) => void;
    onCancel?: (event: any) => void;
    onClose?: (event: any) => void;
}

const Confirm = forwardRef<HTMLDivElement, IConfirmProps>((props, ref) => {
    const {className, style, title, children, hidden, mask, okText, cancelText, onOK, onCancel, onClose} = props;

    const handleOK = (event: any) => {
        if (onOK) onOK(event);
    };

    const handleCancel = (event: any) => {
        if (onCancel) onCancel(event);
    };

    const handleClose = (event: any) => {
        if (onClose) onClose(event);
    };

    return (
        <Window
            ref={ref}
            className={classNames("Confirm", className)}
            style={style}
            title={title}
            hidden={hidden}
            mask={mask}
            showCloseButton
            closeOnEscape
            onClose={handleClose}
        >
            <Content>{children}</Content>
            <Buttons>
                <StyledButton isGrey
                    onClick={handleCancel}
                    width="160px"
                >
                    {cancelText}
                </StyledButton>
                <StyledButton isBlue
                    onClick={handleOK}
                    width="160px"
                >
                    {okText}
                </StyledButton>
            </Buttons>
        </Window>
    );
});

// forwardRef komponenty nie mają displayName, więc warto ją ustawić dla debugowania
Confirm.displayName = "Confirm";

export default Confirm;
