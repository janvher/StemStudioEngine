import styled from "styled-components";

const Bottom = styled.nav`
    position: fixed;
    z-index: 2099;
    bottom: 12px;
    right: 12px;
    padding: 4px 6px;
    background: transparent;
    pointer-events: none;
`;

const Wordmark = styled.div`
    color: rgba(255, 255, 255, 0.86);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45);
    user-select: none;

    @media (max-width: 768px) {
        font-size: 11px;
    }
`;

export const PlayerWatermark = () => (
    <Bottom>
        <Wordmark>Stem Studio</Wordmark>
    </Bottom>
);
