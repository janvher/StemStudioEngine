import styled, {CSSProperties} from "styled-components";

import {flexCenter} from "../../../../../../assets/style";
import {IGameButtonInterface} from "../types";

interface Props {
    customStyle: IGameButtonInterface | null;
    width: string;
    height: string;
    id?: string;
    maxWidth?: string;
    onClick: () => void;
    onHover?: () => void;
    pointerEvent?: boolean;
    children?: any;
    customText?: string;
    textStyle?: CSSProperties;
    disabled?: boolean;
}

export const CustomGameButton = ({
    customStyle,
    width,
    height,
    maxWidth,
    onClick,
    pointerEvent,
    id,
    children,
    customText,
    onHover,
    textStyle,
    disabled,
}: Props) => {
    return (
        <Button
            className="reset-css"
            $customStyle={customStyle}
            width={width}
            height={height}
            maxWidth={maxWidth}
            onClick={onClick}
            $pointerEvent={pointerEvent}
            onMouseEnter={onHover}
            disabled={disabled}
            id={id}
        >
            {customStyle && 
                <>
                    {customStyle.iconSelected && 
                        <Icon>
                            <img src={customStyle.iconSelected.src}
                                alt={customStyle.iconSelected.alt}
                            />
                        </Icon>
                    }
                    <span className="text"
                        style={textStyle}
                    >
                        {customText || customStyle.UIButtonType}
                    </span>
                </>
            }
            {children}
        </Button>
    );
};

const Button = styled.button<{
    $customStyle: IGameButtonInterface | null;
    width: string;
    height: string;
    maxWidth?: string;
    $pointerEvent?: boolean;
}>`
    position: relative;
    ${({$customStyle}) =>
        !$customStyle
            ? `opacity: 0!important; 
       pointer-events: none !important;
      `
            : `
font-size: ${$customStyle.fontSize}px;
font-family: "${$customStyle.fontFamily}" ;
* {
    font-family: "${$customStyle.fontFamily}" ;
}
color: ${$customStyle.fontColor};
border-radius: ${$customStyle.radius ? `${$customStyle.radius}px` : "8px"} !important;
${
    $customStyle.uploadedButtonImg
        ? `
        background-image: url('${$customStyle.uploadedButtonImg}') !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
        background-position: center !important;
      
     `
        : `background-color: ${$customStyle.buttonColor}!important;`
}
`}
    ${({$pointerEvent}) => $pointerEvent && `pointer-events: all;`}
  width: ${({width}) => width};
    height: ${({height}) => height};
    max-width: ${({maxWidth}) => maxWidth ? maxWidth : "100%"};
    display: flex;
    justify-content: flex-start;
    align-items: center;
    overflow: hidden;
    margin-left: auto !important;
    margin-right: auto !important;

    .text {
        flex-grow: 1;
        font-size: 1em;
    }
`;

const Icon = styled.div`
    background-color: #222538;
    ${flexCenter};
    width: 54px;
    height: 100%;
    img {
        width: 20px;
        height: 20px;
    }
`;
