import styled from "styled-components";

import {flexCenter, regularFont} from "../../../assets/style";
import arrowUpRight from "../../assets/arrow-up-right.svg";

interface Props {
    href: string;
    text: string;
    inner?: boolean;
}

export const Link = ({text, href, inner}: Props) => {
    return (
        <StyledLink href={href}
            target={inner ? "_self" : "_blank"}
            rel="noopener noreferrer"
        >
            {text}
            {!inner && <img src={arrowUpRight}
                alt=""
                       />}
        </StyledLink>
    );
};

const StyledLink = styled.a`
    ${flexCenter};
    column-gap: 4px;
    ${regularFont("s")};
    color: var(--theme-homepage-link-color);
    font-weight: var(--theme-font-medium-plus);
`;
