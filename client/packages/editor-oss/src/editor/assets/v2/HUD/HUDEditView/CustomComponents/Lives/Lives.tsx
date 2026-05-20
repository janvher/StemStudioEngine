import styled from "styled-components";

import {Bar, BarImageWrapper, BarWrapper} from "../../commonStyle";
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

export const Lives = ({customStyle, width, height, maxWidth, onClick, currentLives, totalLives}: Props) => {
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
            <StyledBar $customStyle={customStyle}>
                {currentLives} / {totalLives}
            </StyledBar>
        </BarWrapper>
    );
};

const StyledBar = styled(Bar)`
    padding: 0 10px;
`;
