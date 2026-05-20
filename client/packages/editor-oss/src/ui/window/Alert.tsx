import classNames from "classnames";
import React, {forwardRef} from "react";

import Window from "./Window";
import {StyledButton} from "../../editor/assets/v2/common/StyledButton";
import Buttons from "../common/Buttons";
import Content from "../common/Content";

type Props = {
    className?: string;
    style?: React.CSSProperties;
    title?: string;
    children?: React.ReactNode;
    hidden?: boolean;
    mask?: boolean;
    okText?: string;
    onOK?: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    onClose?: (event?: Event | React.SyntheticEvent) => void;
};

const Alert = forwardRef<HTMLDivElement, Props>(
    (
        {className, style, title = "Message", children, hidden = false, mask = false, okText = "OK", onOK, onClose},
        ref,
    ) => {
        const handleOK = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            if (onOK) onOK(event);
        };

        const handleClose = (event: Event | React.SyntheticEvent) => {
            if (onClose) onClose(event);
        };

        return (
            <Window
                ref={ref} // Przekazanie ref do Window
                className={classNames("Alert", className)}
                style={style || {}}
                title={title}
                hidden={hidden}
                mask={mask}
                onClose={handleClose}
            >
                <Content>{children}</Content>
                <Buttons>
                    <StyledButton onClick={handleOK}
                        isBlue
                    >
                        {okText}
                    </StyledButton>
                </Buttons>
            </Window>
        );
    },
);

Alert.displayName = "Alert";

export default Alert;
