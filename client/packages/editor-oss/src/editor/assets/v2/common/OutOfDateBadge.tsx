import {useState} from "react";
import styled, {CSSProperties} from "styled-components";

import {flexCenter} from "../../../../assets/style";

/**
 *
 * @param root0
 * @param root0.className
 * @param root0.tooltipStyle
 */
export default function OutOfDateBadge({className, tooltipStyle}: {className?: string; tooltipStyle?: CSSProperties}) {
    const [hovered, setHovered] = useState(false);

    return (
        <Badge className={className} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            ⚠️
            {hovered && <Info style={tooltipStyle}>Asset out of date</Info>}
        </Badge>
    );
}

const Badge = styled.div`
    ${flexCenter};
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 2;
    font-size: 16px;
    color: #d2a91d;
    padding: 6px;
    border-radius: 4px;
    height: 20px;
`;

const Info = styled.div`
    ${flexCenter};
    position: absolute;
    top: 0;
    right: 0;
    transform: translateY(-100%);
    z-index: 11;
    background-color: #2a2e42;
    font-size: var(--theme-font-size-extra-small);
    padding: 6px;
    border-radius: 4px;
    width: 95px;
    color: white;
`;
