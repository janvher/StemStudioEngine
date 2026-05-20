import styled from "styled-components";

import {Bar, BarImageWrapper, BarWrapper} from "../../commonStyle";
import {IComponentInterface} from "../../types";

type Props = {
    customStyle: IComponentInterface;
    width?: string;
    height?: string;
    maxWidth?: string;
    onClick: () => void;
    time: string;
};

export const Timer = ({customStyle, width, height, maxWidth, onClick, time}: Props) => {
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
            <StyledBar $customStyle={customStyle}>{time}</StyledBar>
        </BarWrapper>
    );
};

const StyledBar = styled(Bar)`
    padding: 0 10px;
`;
