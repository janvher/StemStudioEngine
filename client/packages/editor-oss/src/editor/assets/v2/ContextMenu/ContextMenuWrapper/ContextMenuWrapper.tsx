import React, { useEffect, useMemo, useRef, useState } from "react";

import { Header } from "../../HUD/HUDView/SandboxMenus/CreateMenu/CreateMenu.style";
import { BackButton, CloseButton } from "../common";
import { Container, Separator } from "../ContextMenu.styles";

type Props = {
    children?: React.ReactNode;
    position: { x: number; y: number };
    isOpen: boolean;
    header?: string;
    customWidth?: string;
    setMainMenuPosition?: (position: { x: number; y: number }) => void;
    isWide?: boolean;
    isCreateStep?: boolean;
    center?: boolean;
    isAIBox?: boolean;
    noPadding?: boolean;
    close?: () => void;
};
export const ContextMenuWrapper = ({
    children,
    position,
    isOpen,
    header,
    isAIBox,
    isWide,
    isCreateStep,
    setMainMenuPosition,
    center,
    customWidth,
    noPadding,
    close,
}: Props) => {
    const [menuPosition, setMenuPosition] = useState(position);
    const [dragging, setDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const [isFixed, setIsFixed] = useState(false);
    const menuRef = useRef(null);

    const childrenWithProps = useMemo(() => {
        return React.Children.map(children, child => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
                    ...(child.props as Record<string, unknown>),
                    setisheadervisible: setIsHeaderVisible,
                    setisfixed: setIsFixed,
                });
            }
            return child;
        });
    }, [children, setIsHeaderVisible, setIsFixed]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging) return;
        const x = e.clientX - dragOffset.current.x;
        const y = e.clientY - dragOffset.current.y;
        setMenuPosition({
            x,
            y,
        });
        setMainMenuPosition?.({
            x,
            y,
        });
    };

    const handleMouseUp = () => {
        setDragging(false);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setDragging(true);
        dragOffset.current = {
            x: e.clientX - menuPosition.x,
            y: e.clientY - menuPosition.y,
        };
    };

    useEffect(() => {
        setMenuPosition(position);
    }, [position]);

    useEffect(() => {
        const menu = menuRef.current;
        if (!menu) return;

        const { offsetWidth: width, offsetHeight: height } = menu;
        const { innerWidth, innerHeight } = window;

        let newX = position.x;
        let newY = position.y;

        if (newX + Number(width) > innerWidth) {
            newX = innerWidth - width;
        }

        if (newY + Number(height) > innerHeight) {
            newY = innerHeight - height;
        }

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;

        setMenuPosition({ x: newX, y: newY });
        setMainMenuPosition?.({ x: newX, y: newY });
    }, [position, setMainMenuPosition]);

    const handleClose = () => {
        close?.();
    };

    return (
        <Container
            ref={menuRef}
            style={
                !isFixed
                    ? center
                        ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
                        : { top: menuPosition.y, left: menuPosition.x, transform: "translate(-15px, -15px)" }
                    : {}
            }
            $isFixedToBottom={isFixed}
            $isWide={isWide}
            $customWidth={customWidth}
            $noPadding={noPadding}
            $isCreateStep={isCreateStep}
            $isAIBox={isAIBox}
            $isOpen={isOpen}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {isHeaderVisible && header &&
                <>
                    <Header onMouseDown={handleMouseDown}>
                        <BackButton onClick={handleClose} />
                        {header} <CloseButton onClick={handleClose} />
                    </Header>
                    <Separator $invisible />
                </>
            }

            {childrenWithProps}
        </Container>
    );
};
