import {flip, offset, shift, size, useFloating} from "@floating-ui/react";
import {Combobox} from "@headlessui/react";
import classNames from "classnames";
import {useRef, useState, useEffect, useMemo, useCallback} from "react";
import {createPortal} from "react-dom";
import {useOnClickOutside} from "usehooks-ts";

import {ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, StyledCombobox} from "./style";
import arrow from "../../RightPanel/icons/arrow-down.svg";

export interface Item {
    key: string;
    value: string;
    uuid?: string;
}

type Props = {
    data: Item[];
    value?: Item;
    onChange: (selectedData: Item) => void;
    className?: string;
    showListOnTop?: boolean;
    hideArrow?: boolean;
    disableTyping?: boolean;
    disabled?: boolean;
};

const DEBOUNCE_MS = 150;
const MAX_RENDERED_ITEMS = 50;
const INITIAL_RENDER_COUNT = 20;

export const BasicCombobox = ({
    data,
    value,
    onChange,
    className,
    showListOnTop,
    disableTyping = true,
    hideArrow,
    disabled,
}: Props) => {
    const [query, setQuery] = useState("");
    const arrowRef = useRef<HTMLButtonElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [renderCount, setRenderCount] = useState(INITIAL_RENDER_COUNT);
    const {refs, floatingStyles} = useFloating({
        placement: "bottom-start",
        middleware: [
            offset(4),
            flip(),
            shift({padding: 8}),
            size({
                apply({rects, elements, placement}) {
                    const referenceTop = rects.reference.y;
                    const referenceBottom = rects.reference.y + rects.reference.height;

                    const spaceBelow = window.innerHeight - referenceBottom;
                    const spaceAbove = referenceTop;

                    const isPlacedTop = placement.startsWith("top");

                    const available = isPlacedTop ? spaceAbove : spaceBelow;

                    const maxHeight = Math.min(320, available - 8);

                    Object.assign(elements.floating.style, {
                        maxHeight: `${Math.max(0, maxHeight)}px`,
                        overflowY: "auto",
                        width: `${rects.reference.width}px`,
                    });
                },
            }),
        ],
    });

    useOnClickOutside(containerRef as React.RefObject<HTMLElement>, event => {
        if (
            event.target instanceof Node &&
            !document.querySelector(".combobox-options-wrapper")?.contains(event.target) &&
            !containerRef.current?.contains(event.target)
        ) {
            setIsOpen(false);
        }
    });

    const handleInputClick = useCallback(() => {
        if (!disabled) {
            setIsOpen(true);
            setRenderCount(INITIAL_RENDER_COUNT);
            if (inputRef.current) {
                const length = inputRef.current.value.length;
                inputRef.current.setSelectionRange(length, length);
            }
        }
    }, [disabled]);

    const handleChange = useCallback(
        (selectedItem: Item | null) => {
            if (!selectedItem) return;
            onChange(selectedItem);
            setQuery("");
            // setInputValue("");
            setTimeout(() => {
                setIsOpen(false);
                if (inputRef.current) {
                    inputRef.current.focus();
                    const length = inputRef.current.value.length;
                    inputRef.current.setSelectionRange(length, length);
                }
            }, 50);
        },
        [onChange],
    );

    const filteredData = useMemo(() => {
        if (query === "") return data?.slice(0, MAX_RENDERED_ITEMS) || [];
        const lowerQuery = query.toLowerCase();
        const results: Item[] = [];
        for (let i = 0; i < data.length && results.length < MAX_RENDERED_ITEMS; i++) {
            if (data[i]!.value.toLowerCase().includes(lowerQuery)) {
                results.push(data[i]!);
            }
        }
        return results;
    }, [query, data]);

    const handleScroll = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            const target = e.target as HTMLDivElement;
            const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
            if (bottom && renderCount < filteredData.length) {
                setRenderCount(prev => Math.min(prev + 20, filteredData.length));
            }
        },
        [renderCount, filteredData.length],
    );

    const handleQueryChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = event.target.value;
        // setInputValue(newQuery);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            setQuery(newQuery);
            setRenderCount(INITIAL_RENDER_COUNT);
        }, DEBOUNCE_MS);

        setIsOpen(true);
    }, []);

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return (
        <StyledCombobox
            ref={containerRef}
            className={`StyledCombobox ${className}`}
            onClick={handleInputClick}
        >
            <Combobox
                ref={refs.setReference}
                value={value || {key: "0", value: "none"}}
                onChange={handleChange}
                as="div"
                style={{width: "100%"}}
            >
                <div>
                    <ComboboxInput
                        ref={inputRef}
                        className="combobox-input"
                        displayValue={item => (item as unknown as Item).value}
                        onChange={handleQueryChange}
                        onClick={handleInputClick}
                        readOnly={disableTyping}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={e => {
                            // Stop all keyboard events from propagating to prevent camera controls, object deletion, etc.
                            e.stopPropagation();

                            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                                setIsOpen(true);
                            }
                            if (e.key === "Escape") {
                                setIsOpen(false);
                            }
                            if (e.key === "Enter" && !isOpen) {
                                setIsOpen(true);
                            }
                        }}
                    />
                    {!hideArrow && (
                        <ComboboxButton
                            className="combobox-button"
                            ref={arrowRef}
                            onMouseDown={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsOpen(prev => !prev);
                            }}
                        >
                            <img
                                src={arrow}
                                alt="open list"
                            />
                        </ComboboxButton>
                    )}
                </div>
                {isOpen &&
                    createPortal(
                        <ComboboxOptions
                            ref={refs.setFloating}
                            style={floatingStyles}
                            className={classNames(
                                "combobox-options-wrapper",
                                showListOnTop && "combobox-options-wrapper--top",
                            )}
                            onScroll={handleScroll}
                            static
                        >
                            {data.length > MAX_RENDERED_ITEMS && query === "" && (
                                <div
                                    style={{
                                        padding: "6px 8px",
                                        background: "#fff3cd",
                                        color: "#856404",
                                        borderBottom: "1px solid #ddd",
                                        fontSize: "12px",
                                    }}
                                >
                                    ⚠️ {data.length} items - use search to filter
                                </div>
                            )}
                            {filteredData.slice(0, renderCount).map(dataItem => (
                                <ComboboxOption
                                    key={dataItem.key}
                                    value={dataItem}
                                    onClick={() => {
                                        handleChange(dataItem);
                                    }}
                                    className={(prop: {active: boolean}) =>
                                        classNames("combobox-option", prop.active && "bg-blue-500")
                                    }
                                >
                                    {dataItem.value}
                                </ComboboxOption>
                            ))}
                            {renderCount < filteredData.length && (
                                <div style={{padding: "8px", textAlign: "center", color: "#888"}}>
                                    Showing {renderCount} of {filteredData.length} items. Scroll for more...
                                </div>
                            )}
                        </ComboboxOptions>,
                        document.body,
                    )}
            </Combobox>
        </StyledCombobox>
    );
};
