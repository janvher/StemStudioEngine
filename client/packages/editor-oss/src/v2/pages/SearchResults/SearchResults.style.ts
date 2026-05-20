import styled from "styled-components";

import {flexCenter, regularFont} from "../../../assets/style";

const Container = styled.div`
    position: relative;
    background-color: var(--theme-container-main-dark);
`;

export const SearchContainer = styled(Container)`
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    row-gap: 20px;

    .norResults {
        ${regularFont("s")};
    }
`;

export const TitleRow = styled.div`
    font-size: 48px;
    font-weight: var(--theme-font-medium-plus);
    color: #fff;
    ${flexCenter};
    justify-content: space-between;

    @media only screen and (max-width: 767px) {
        font-size: 32px;
    }
`;

export const InnerPadding = styled.div`
    padding: 0 20px;
    display: flex;
    flex-direction: column;
    row-gap: 20px;
    flex-grow: 1;
`;
