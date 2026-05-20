import styled from "styled-components";

export const Container = styled.div`
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
    flex: 1;
    padding: 0 24px;
`;

export const Content = styled.div`
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding: 56px 0 64px;

    h1 {
        font-size: 32px;
        line-height: 1.2;
        margin: 0 0 16px;
    }

    .lede {
        font-size: 18px;
        color: rgba(255, 255, 255, 0.78);
        line-height: 1.55;
        margin-bottom: 32px;
    }

    h2 {
        font-size: 20px;
        margin: 32px 0 12px;
        color: rgba(255, 255, 255, 0.92);
    }

    p {
        font-size: 15px;
        line-height: 1.65;
        color: rgba(255, 255, 255, 0.78);
        margin: 0 0 12px;
    }

    ul {
        padding-left: 20px;
        margin: 0 0 16px;
    }

    li {
        font-size: 15px;
        line-height: 1.65;
        color: rgba(255, 255, 255, 0.78);
        margin: 4px 0;
    }
`;
