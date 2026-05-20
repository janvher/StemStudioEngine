import styled from "styled-components";

export const Container = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--theme-container-minor-dark);
    color: #fff;
    overflow-y: auto;
    overflow-x: hidden;

    a {
        color: #00a3ff;
    }
`;

export const Wrapper = styled.div`
    width: 100%;
    margin: 0 24px;
    flex: 1;
`;
export const Content = styled.div`
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    padding: 40px 0;

    .title {
        font-size: 24px;
        font-weight: var(--theme-font-medium-plus);
        line-height: 120%;
        text-align: left;
    }

    .updateDate {
        margin: 8px 0 40px;
        font-size: 16px;
    }

    .text {
        font-size: 16px;
        line-height: 24px;
    }
`;

// Content

export const SectionTitle = styled.h2`
    font-size: 20px;
    font-weight: var(--theme-font-medium-plus);
    margin: 20px 0 0 0;
`;

export const Paragraph = styled.p`
    margin-bottom: 0;
`;

export const Bold = styled.span<{$uppercase?: boolean}>`
    font-weight: var(--theme-font-medium-plus);
    ${({$uppercase}) => $uppercase && "text-transform: uppercase;"}
`;

export const List = styled.ul<{$lowerAlpha?: boolean}>`
    margin: 0;
    padding: 16px 16px 0;
    ${({$lowerAlpha}) => $lowerAlpha && "list-style: lower-alpha;"}

    li {
        margin-bottom: 8px;
    }
`;
