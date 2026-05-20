import React, {useRef} from "react";
import {ClipLoader} from "react-spinners";
import {useNavigate} from "react-router-dom";
import {useOnClickOutside} from "usehooks-ts";

import {Container, MenuItem, Overlay} from "./AppMenu.style";
import {ROUTES} from "@web-shared/routes";

export enum USER_MENU_ITEM {
    SETTINGS = "Account Settings",
}

interface Props {
    close: () => void;
    userMenuButtonRef: React.MutableRefObject<HTMLButtonElement | SVGSVGElement | null>;
    isLoading: boolean;
}

export const UserMenu = ({close, userMenuButtonRef, isLoading}: Props) => {
    const userMenuRef = useRef<HTMLDivElement | null>(null);
    const menuListItems = Object.values(USER_MENU_ITEM);
    const checkboxRef = useRef<any>(null);
    const navigate = useNavigate();

    useOnClickOutside(
        [userMenuRef as React.MutableRefObject<HTMLElement>, userMenuButtonRef as React.MutableRefObject<HTMLElement>],
        close,
    );

    const handleUserMenuItemClick = async (item: USER_MENU_ITEM) => {
        switch (item) {
            case USER_MENU_ITEM.SETTINGS:
                await navigate(ROUTES.SETTINGS);
                break;
            default:
                break;
        }
    };

    const handleMenuItemClick = async (event: any, item: USER_MENU_ITEM) => {
        if (checkboxRef.current && checkboxRef.current.contains(event.target)) {
            return;
        }

        await handleUserMenuItemClick(item);
    };

    return (
        <Container ref={userMenuRef}
            $right
        >
            {menuListItems.map((item, index) => {
                return (
                    <MenuItem key={index}
                        onClick={e => handleMenuItemClick(e, item)}
                    >
                        {item}
                    </MenuItem>
                );
            })}
            {isLoading &&
                <Overlay>
                    <ClipLoader loading
                        size={40}
                        color="#0284c7"
                        aria-label="Loading Spinner"
                    />
                </Overlay>
            }
        </Container>
    );
};
