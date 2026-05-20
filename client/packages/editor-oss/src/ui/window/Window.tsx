import classNames from "classnames";
import React, {forwardRef, useEffect, useRef, useState} from "react";
import {useOnClickOutside} from "usehooks-ts";

import {Buttons, Content} from "../index";
import "./css/Window.css";

type Props = {
    className: string;
    style?: React.CSSProperties;
    title: string;
    children?: React.ReactNode;
    padding?: boolean;
    hidden?: boolean;
    mask?: any;
    showCloseButton?: boolean;
    closeOnEscape?: boolean;
    onClose?: (event: any) => void;
};

const Window = forwardRef<HTMLDivElement, Props>(
    ({className, style, title, children, padding, hidden, mask, showCloseButton, closeOnEscape, onClose}, ref) => {
        const localRef = useRef<HTMLDivElement>(null);
        const dom = ref || localRef;
        const popupRef = useRef<HTMLDivElement>(null);

        const [isDown, setIsDown] = useState(false);
        const [offsetX, setOffsetX] = useState(0);
        const [offsetY, setOffsetY] = useState(0);

        const handleMouseDown = (event: any) => {
            setIsDown(true);

            const domCurrent = (dom as React.RefObject<HTMLDivElement>).current;
            if (domCurrent) {
                const left = domCurrent.style.left === "" ? 0 : parseInt(domCurrent.style.left.replace("px", ""));
                const top = domCurrent.style.top === "" ? 0 : parseInt(domCurrent.style.top.replace("px", ""));

                setOffsetX(event.clientX - left);
                setOffsetY(event.clientY - top);
            }
        };

        const handleMouseMove = (event: any) => {
            if (!isDown) {
                return;
            }

            const dx = event.clientX - offsetX;
            const dy = event.clientY - offsetY;

            const domCurrent = (dom as React.RefObject<HTMLDivElement>).current;
            if (domCurrent) {
                domCurrent.style.left = `${dx}px`;
                domCurrent.style.top = `${dy}px`;
            }
        };

        const handleMouseUp = () => {
            setIsDown(false);
            setOffsetX(0);
            setOffsetY(0);
        };

        const handleClose = (event: any) => {
            onClose && onClose(event);
        };

        useEffect(() => {
            document.body.addEventListener("mousemove", handleMouseMove);
            document.body.addEventListener("mouseup", handleMouseUp);

            return () => {
                document.body.removeEventListener("mousemove", handleMouseMove);
                document.body.removeEventListener("mouseup", handleMouseUp);
            };
        }, []);

        useEffect(() => {
            if (!closeOnEscape) {
                return;
            }

            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key !== "Escape") {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                handleClose(event);
            };

            window.addEventListener("keydown", handleKeyDown, true);

            return () => {
                window.removeEventListener("keydown", handleKeyDown, true);
            };
        }, [closeOnEscape, onClose]);

        let _children = null;

        if (children && Array.isArray(children)) {
            _children = children;
        } else if (children) {
            _children = [children];
        }

        const content = _children?.filter(n => {
            return n.type === Content;
        })[0];

        const buttons = _children?.filter(n => {
            return n.type === Buttons;
        })[0];

        useOnClickOutside(popupRef as React.RefObject<HTMLElement>, handleClose);

        return (
            <div className={classNames("WindowMaskV2", mask && "mask", hidden && "hidden")}>
                <div className={classNames("Window", !padding && "no-padding", className)}
                    style={style}
                    ref={dom}
                >
                    <div className={"wrap"}
                        ref={popupRef}
                    >
                        <div className={"title"}
                            onMouseDown={handleMouseDown}
                        >
                            <span>{title}</span>
                            {showCloseButton &&
                                <div className={"controls"}>
                                    <button
                                        type="button"
                                        className={"window-close-button icon reset-css"}
                                        onMouseDown={event => event.stopPropagation()}
                                        onClick={event => {
                                            event.stopPropagation();
                                            handleClose(event);
                                        }}
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>
                            }
                        </div>
                        <div className={"content"}>{content && content.props.children}</div>
                        {buttons && 
                            <div className={"buttons"}>
                                <div className={"button-wrap"}>{buttons && buttons.props.children}</div>
                            </div>
                        }
                    </div>
                </div>
            </div>
        );
    },
);

Window.displayName = "Window";

export default Window;
