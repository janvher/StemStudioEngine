import {Bar, BarImageWrapper, BarWrapper, ProgressBar} from "../../commonStyle";
import {IComponentInterface} from "../../types";

type Props = {
    customStyle: IComponentInterface;
    width?: string;
    height?: string;
    maxWidth?: string;
    onClick: () => void;
};

export const Collectable = ({customStyle, width, height, maxWidth, onClick}: Props) => {
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
                <ProgressBar width="40%"
                    $customStyle={customStyle}
                >
                    40%
                </ProgressBar>
            </Bar>
        </BarWrapper>
    );
};
