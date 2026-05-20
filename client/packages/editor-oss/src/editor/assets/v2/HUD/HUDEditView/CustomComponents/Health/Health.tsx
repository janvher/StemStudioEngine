import styled from "styled-components";

import {Bar, BarImageWrapper, BarWrapper, ProgressBar} from "../../commonStyle";
import {IComponentInterface} from "../../types";

type Props = {
    customStyle: IComponentInterface;
    width?: string;
    height?: string;
    maxWidth?: string;
    onClick: () => void;
    currentLives: number;
    totalLives: number;
};

export const Health = ({customStyle, width, height, maxWidth, onClick, currentLives, totalLives}: Props) => {
    const handleHealth = () => {
        if (totalLives === 0) {
            console.warn("Received 0 for total lives");
            return "0%";
        }
        return `${Math.floor(currentLives * 100 / totalLives)}%`;
    };
    return (
        <BarWrapper $customStyle={customStyle}
            width={width}
            height={height}
            $maxWidth={maxWidth}
            onClick={onClick}
        >
            {customStyle.iconSelected && 
                <BarImageWrapper $customStyle={customStyle}>
                    <img src={customStyle.iconSelected.src}
                        alt={customStyle.iconSelected.alt}
                    />
                </BarImageWrapper>
            }
            <Bar $customStyle={customStyle}>
                <Progress width={handleHealth()}
                    $customStyle={customStyle}
                >
                    {handleHealth()}
                </Progress>
            </Bar>
        </BarWrapper>
    );
};

export const Progress = styled(ProgressBar)<{
    width: string;
    $customStyle: IComponentInterface;
}>`
    min-width: 40px;
    ${({width}) => width === "0%" && `background-color: transparent`}
`;
