import classNames from "classnames";
import React, {forwardRef} from "react";

import Window from "./Window";
import {StyledButton} from "../../editor/assets/v2/common/StyledButton";
import Input from "../form/v2/Input";
import {Buttons, Content} from "../index";

type Props = {
    className: string;
    style: React.CSSProperties;
    title: string;
    children?: React.ReactNode;
    hidden?: boolean;
    mask?: any;
    okText?: string;
    value: string;
    onOK?: (value: string, event: any) => void;
    handleCancel?: () => void;
    onClose?: (event: any) => void;
};

const Prompt = forwardRef<HTMLDivElement, Props>(
    ({className, style, title, children, hidden, mask, okText, value, onOK, onClose, handleCancel}, ref) => {
        const [inputValue, setInputValue] = React.useState(value);

        const handleOK = (event: any) => {
            onOK && onOK(inputValue, event);
        };

        const handleClose = (event: any) => {
            onClose && onClose(event);
        };
        return (
            <Window
                ref={ref}
                className={classNames("Prompt", className)}
                style={style}
                title={title}
                hidden={hidden}
                mask={mask}
                onClose={handleClose}
            >
                <Content>
                    {children} <Input value={inputValue}
                        onChange={value => setInputValue(String(value) || "")}
                               />
                </Content>
                <Buttons>
                    <StyledButton isBlue
                        onClick={handleOK}
                    >
                        {okText}
                    </StyledButton>
                    <StyledButton isGrey
                        onClick={handleCancel || handleClose}
                    >
                        Cancel
                    </StyledButton>
                </Buttons>
            </Window>
        );
    },
);

Prompt.displayName = "Prompt";

export default Prompt;
