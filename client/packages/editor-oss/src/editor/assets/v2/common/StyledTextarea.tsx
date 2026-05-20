import {CSSProperties} from "react";
import styled from "styled-components";

const Area = styled.textarea<{width?: string; height?: string; $padding?: string; $background?: string}>`
    width: ${props => props.width || "100%"};
    height: ${props => props.height || "64px"};
    padding: ${props => props.$padding || "8px"};
    background: ${props => props.$background || "var(--theme-grey-bg)"};
    resize: none;
    border: none;
    border-radius: 8px;
    font-size: var(--theme-font-size-s);
    color: var(--theme-font-main-selected-color);
`;

type Props = {
    width?: string;
    height?: string;
    padding?: string;
    background?: string;
    placeholder?: string;
    value: string;
    setValue: (value: string) => void;
    onBlur?: () => void;
    style?: CSSProperties;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const StyledTextarea = ({
    width,
    height,
    padding,
    background,
    placeholder,
    value,
    setValue,
    onBlur,
    style,
    ...rest
}: Props) => {
    return (
        <Area
            width={width}
            height={height}
            $padding={padding}
            $background={background}
            placeholder={placeholder}
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={onBlur}
            style={style}
            {...rest}
        />
    );
};
