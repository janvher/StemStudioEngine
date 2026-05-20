import React from "react";

import {Color, SuggestedColors} from "./ColorSuggestions.style";
import {hexToRgb} from "../../../../../../v2/pages/services";

interface Props {
    setColor: (value: string) => void;
    setRGB: React.Dispatch<
        React.SetStateAction<{
            r: number;
            g: number;
            b: number;
        }>
    >;
    currentColor: string;
}

const COLORS = [
    // row 1
    "#FEFEFE",
    "#AEAEAE",
    "#666666",
    "#000000",
    // row 2
    "#C1E0FE",
    "#64B0FE",
    "#155FDA",
    "#002A88",
    // row 3
    "#D4D3FE",
    "#9390FE",
    "#4240FE",
    "#1412A8",
    // row 4
    "#E9C8FE",
    "#C777FE",
    "#7627FF",
    "#3B00A4",
    // row 5
    "#FBC3FE",
    "#F36AFE",
    "#A11BCD",
    "#5C007E",
    // row 6
    "#FEC5EB",
    "#FE6ECD",
    "#B81E7C",
    "#6E0040",
    // row 7
    "#FECDC6",
    "#FE8270",
    "#B53220",
    "#6C0700",
    // row 8
    "#F7D9A6",
    "#EB9F23",
    "#994F00",
    "#571D00",
    // row 9
    "#E5E695",
    "#BDBF00",
    "#6C6E00",
    "#343500",
    // row 10
    "#D0F097",
    "#89D900",
    "#388700",
    "#0C4900",
    // row 11
    "#B4F3CD",
    "#45E182",
    "#009032",
    "#004F08",
    // row 12
    "#B5ECF3",
    "#48CEDF",
    "#007C8E",
    "#00404E",
];

export const ColorSuggestions = ({currentColor, setColor, setRGB}: Props) => {
    return (
        <SuggestedColors className="hidden-scroll">
            {COLORS.map(value => 
                <Color
                    $bgColor={value}
                    key={value}
                    onClick={() => {
                        setColor(value);
                        setRGB(hexToRgb(value));
                    }}
                    $active={currentColor.toLowerCase() === value.toLowerCase()}
                />,
            )}
        </SuggestedColors>
    );
};
