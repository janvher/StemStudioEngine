import React, {forwardRef} from "react";
import styled from "styled-components";

interface ToastProps {
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}

const ToastMark = styled.div`
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1300;
    pointer-events: none;
`;

const ToastContainer = styled.div`
    color: #fff;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 16px 24px;
    border-radius: 3px;
    box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.14);
    display: inline-block;
    pointer-events: none;
`;

const Toast = forwardRef<HTMLDivElement, ToastProps>(({className, style, children}, ref) => {
    return (
        <ToastMark>
            <ToastContainer ref={ref}
                className={className}
                style={style}
            >
                {children}
            </ToastContainer>
        </ToastMark>
    );
});

Toast.displayName = "Toast";

export default Toast;
