import React from "react";
import styled from "styled-components";

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
        radial-gradient(circle at 24% 32%, rgba(175, 62, 24, 0.28), transparent 28%),
        radial-gradient(circle at 76% 42%, rgba(35, 101, 196, 0.22), transparent 32%),
        linear-gradient(180deg, #050510 0%, #09091a 52%, #05050d 100%);
`;

export const BackgroundShader: React.FC = () => <Backdrop />;
