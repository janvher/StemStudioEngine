import {useState} from "react";
import styled from "styled-components";

import {RevisionList, RevisionListProps} from "./RevisionList";
import {flexCenter} from "../../../../../assets/style";
import arrowDown from "../images/arrow-down.svg";

type RevisionSectionProps = RevisionListProps & {
    collapsible?: boolean;
};

export const RevisionSection = ({collapsible = true, ...props}: RevisionSectionProps) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <Wrapper className="RevisionSection">
            {collapsible && (
                <SectionTitle onClick={() => setIsExpanded(prev => !prev)}>
                    <Title>Revisions</Title>
                    <ExpandButton className="reset-css"
                        $expanded={isExpanded}
                    >
                        <img src={arrowDown}
                            alt="show more"
                        />
                    </ExpandButton>
                </SectionTitle>
            )}
            {(!collapsible || isExpanded) && <RevisionList {...props} />}
        </Wrapper>
    );
};

const Wrapper = styled.div`
    padding: 0 8px 12px 8px;
    width: 100%;
`;

const Title = styled.div`
    width: 100%;
    font-size: 12px;
    line-height: 120%;
    color: var(--theme-font-main-selected-color);
    font-weight: 500;
    margin-bottom: 8px;
`;

const ExpandButton = styled.button<{$expanded: boolean}>`
    width: 24px;
    height: 24px;
    ${flexCenter};
    img {
        width: 16px;
        height: 16px;
        transition: 0.3s;
        ${({$expanded}) => $expanded && `transform: rotate(180deg)`};
    }
`;

const SectionTitle = styled.div`
    ${flexCenter};
    justify-content: space-between;
    cursor: pointer;
    width: 100%;
`;
