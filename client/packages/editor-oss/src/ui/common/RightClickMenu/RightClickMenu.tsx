import {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";

interface Props {
    onClickoutsideCallback: () => void;
    children: any;
    top: number;
    left: number;
}

/**
 *
 * @param ref
 * @param callback
 */
function useCustomOnClickOutside(ref: React.RefObject<HTMLElement | null>, callback: () => void) {
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref, callback]);
}

export const RightClickMenu = ({onClickoutsideCallback, children, top, left}: Props) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [adjustedTop, setAdjustedTop] = useState(top);

    useCustomOnClickOutside(ref, onClickoutsideCallback);

    useEffect(() => {
        if (ref.current) {
            const {offsetHeight} = ref.current;
            const maxTop = window.innerHeight - offsetHeight - 10;
            setAdjustedTop(Math.min(top, maxTop));
        }
    }, [top, children]);

    return ReactDOM.createPortal(
        <ItemMenu ref={ref}
            top={adjustedTop}
            left={left}
        >
            {children}
        </ItemMenu>,
        document.body,
    );
};

export const ItemMenu = styled.div<{top: number; left: number}>`
    position: absolute;
    top: ${({top}) => top}px;
    left: ${({left}) => left}px;
    z-index: 1000;

    display: flex;
    flex-direction: column;
    min-width: 84px;

    background-color: var(--theme-grey-bg);
    font-size: var(--theme-font-size-s);
    pointer-events: all;
    overflow: hidden;

    padding: 4px;
    border: 1px solid var(--theme-grey-bg-secondary-button);
    border-radius: 8px;
    box-shadow: 0px 4px 15px 0px #000;
`;

export const ItemMenuText = styled.div<{$red?: boolean}>`
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    transition: all 0.3s ease-in-out;
    cursor: pointer;
    display: inline-block;
    color: ${({$red}) => $red ? "var(--theme-font-red)" : "#d4d4d8"};
    text-align: left;
    &:hover {
        background: var(--theme-grey-bg-secondary-button);
    }
`;

export const MenuSeparator = styled.div`
    width: 100%;
    height: 1px;
    background-color: var(--theme-grey-bg-secondary-button);
    margin: 4px 0;
`;
