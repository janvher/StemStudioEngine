import {Combobox} from "@headlessui/react";
import {useRef, useState} from "react";

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
    customInputValue?: string;
    showListOnTop?: boolean;
    hideArrow?: boolean;
    disableTyping?: boolean;
    disabled?: boolean;
    customBgColor?: string;
    customRadius?: string;
    customColor?: string;
};

export const getComboboxItem = (data: string[], key: string, uuids?: string[]) => {
    return data.map((option: string, index) => {
        return {
            key,
            value: option,
            uuid: uuids?.[index],
        };
    });
};

export const BasicComboboxNoPortal = ({
    data,
    value,
    onChange,
    className,
    showListOnTop,
    disableTyping,
    hideArrow,
    disabled,
    customInputValue,
    customBgColor,
    customRadius,
    customColor,
}: Props) => {
    const [query, setQuery] = useState("");
    const arrowRef = useRef<HTMLButtonElement | null>(null);

    const filteredData =
        query === ""
            ? data
            : data.filter(dataItem => {
                  return dataItem.value.toLowerCase().includes(query.toLowerCase());
              });

    return (
        <StyledCombobox
            className={`StyledCombobox ${className}`}
            onClick={() => disabled ? undefined : arrowRef?.current?.click()}
        >
            <Combobox
                value={
                    value || {
                        key: "0",
                        value: "none",
                    }
                }
                onChange={disabled ? undefined : (item: Item | null) => { if (item) onChange(item); }}
            >
                <ComboboxInput
                    displayValue={item => customInputValue || (item as unknown as Item).value}
                    onChange={event => disabled ? undefined : setQuery(event.target.value)}
                    {...{readOnly: !!disableTyping}}
                    $disabled={!!disabled}
                    customBgColor={customBgColor}
                    customRadius={customRadius}
                    customColor={customColor}
                />
                {!hideArrow && 
                    <ComboboxButton ref={arrowRef}
                        $disabled={!!disabled}
                        disabled={disabled}
                    >
                        <img src={arrow}
                            alt="open list"
                        />
                    </ComboboxButton>
                }
                <ComboboxOptions $onTop={!!showListOnTop}
                    $disabled={disabled}
                >
                    {filteredData.map((dataItem, index) => 
                        <ComboboxOption key={dataItem.key + index}
                            $disabled={disabled}
                            value={dataItem}
                        >
                            {dataItem.value}
                        </ComboboxOption>,
                    )}
                </ComboboxOptions>
            </Combobox>
        </StyledCombobox>
    );
};
