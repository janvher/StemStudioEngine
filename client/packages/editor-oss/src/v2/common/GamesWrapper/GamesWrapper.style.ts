import styled from "styled-components";

export const GamesWrapper = styled.div`
    flex-grow: 1;
    width: 100%;
    max-width: 100%;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    align-items: start;
    justify-items: start;
    gap: 20px;

    @media only screen and (max-width: 1023px) {
        grid-template-columns: repeat(3, 1fr);
    }

    @media only screen and (max-width: 767px) {
        grid-template-columns: repeat(1, 1fr);
    }

    .loadeMoreBtn {
        margin: 0 auto;
    }
`;
