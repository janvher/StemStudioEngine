import styled from "styled-components";

import warningIcon from "./warning-icon.svg";
import {WarningOptions} from "./WarningRenderer";

export const CustomWarning = ({description, title, onCancel, onConfirm}: WarningOptions) => {
    const heading = title || "Warning: Something Needs Attention";

    return (
        <Backdrop>
            <Modal>
                <Header>
                    <img
                        src={warningIcon}
                        alt=""
                    />
                    {heading}
                </Header>
                {description && <Body>{description}</Body>}

                <Actions>
                    {onCancel && <CancelButton onClick={onCancel}>Cancel</CancelButton>}
                    <ConfirmButton onClick={onConfirm}>Confirm</ConfirmButton>
                </Actions>
            </Modal>
        </Backdrop>
    );
};

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(20, 22, 26, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
`;

const Modal = styled.div`
    width: 480px;
    border-radius: 16px;
    background: #27272a;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    overflow: hidden;

    color: #f8fafccc;
    font-weight: 600;
    line-height: 150%;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 32px;
    font-size: 24px;
    border-bottom: 1px solid #f8fafccc;
    font-weight: inherit;
    line-height: 150%;
`;

const Body = styled.div`
    padding: 16px 32px 32px;
    margin-top: 32px;
    font-size: 16px;
    font-weight: inherit;
    line-height: 150%;
`;

const Actions = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 24px 32px 32px;
`;

const BaseButton = styled.button`
    flex-grow: 1;
    height: 36px;
    border-radius: 999px;
    border-radius: 16px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: inherit;
    line-height: 150%;
`;

const CancelButton = styled(BaseButton)`
    color: #f8fafccc;
    border: 0.5px solid #686c78;
    background: #18181b66;
    box-shadow:
        0 0 2px 0 rgba(211, 218, 224, 0.4) inset,
        0 0 2px 0 #d3dae0;

    &:hover {
        background: #2a2d34;
    }
`;

const ConfirmButton = styled(BaseButton)`
    border: 0.5px solid #02c782;
    background: rgba(2, 199, 130, 0.1);
    box-shadow:
        0 0 2px 0 #5fefbd inset,
        0 0 2px 0 #5fefbd;
    color: #f8fafccc;

    &:hover {
        filter: brightness(1.1);
    }
`;
