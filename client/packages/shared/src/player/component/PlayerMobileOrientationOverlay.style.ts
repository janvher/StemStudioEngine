import styled from "styled-components";

export const Overlay = styled.div`
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 24px;
`;

export const Title = styled.h2`
    color: #ffffff;
    font-size: 22px;
    font-weight: 600;
    margin: 0;
    text-align: center;
`;

export const Subtitle = styled.p`
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    margin: 0;
    text-align: center;
`;
