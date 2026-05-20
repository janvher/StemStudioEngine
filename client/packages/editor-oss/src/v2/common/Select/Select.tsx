import {Combobox} from "@headlessui/react";
import {useRef, useState} from "react";

import arrow from "./icon/arrow-down.svg";
import {SelectButton, SelectInput, SelectOption, SelectOptions, StyledCombobox} from "./Select.style";

export interface Item {
    key: string;
    value: string;
}

type Props = {
    data: Item[];
    value?: Item;
    onChange: (selectedData: Item) => void;
    className?: string;
    width?: string;
    height?: string;
    fontSize?: string;
    showListOnTop?: boolean;
};

export const Select = ({data, value, onChange, showListOnTop, width, height, fontSize}: Props) => {
    const [query, setQuery] = useState("");
    const arrowRef = useRef<HTMLButtonElement | null>(null);

    const filteredData =
        query === ""
            ? data
            : data.filter(dataItem => {
                  return dataItem.value.toLowerCase().includes(query.toLowerCase());
              });

    return (
        <StyledCombobox onClick={() => arrowRef?.current?.click()}
            $width={width}
        >
            <Combobox
                value={
                    value || {
                        key: "0",
                        value: "none",
                    }
                }
                onChange={(item: Item | null) => { if (item !== null) onChange(item); }}
            >
                <SelectInput
                    $height={height}
                    $fontSize={fontSize}
                    displayValue={(item: unknown) => (item as Item).value}
                    onChange={event => setQuery(event.target.value)}
                />
                <SelectButton ref={arrowRef}>
                    <img src={arrow}
                        alt="open list"
                    />
                </SelectButton>
                <SelectOptions $showListOnTop={showListOnTop}>
                    {filteredData.map(dataItem => 
                        <SelectOption key={dataItem.key}
                            value={dataItem}
                        >
                            {dataItem.value}
                        </SelectOption>,
                    )}
                </SelectOptions>
            </Combobox>
        </StyledCombobox>
    );
};
