import styled from "styled-components";

import {regularFont} from "../../../../../assets/style";

interface Props {
    children: React.ReactNode;
}

export const DevPropertiesWrapper = ({children}: Props) => {
    if (!process.env.SHOW_DEV_PROPERTIES) return null;

    return (
        <Wrapper>
            <div className="label">Dev Properties</div>
            {children}
        </Wrapper>
    );
};

const Wrapper = styled.div`
    .label {
        ${regularFont("s")};
        font-weight: var(--theme-font-medium-plus);
        margin-bottom: 8px;
    }
`;
