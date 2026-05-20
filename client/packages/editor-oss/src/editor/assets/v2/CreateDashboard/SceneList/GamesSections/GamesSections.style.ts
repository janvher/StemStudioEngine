import styled from "styled-components";

export const SectionWrapper = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

export const HorizontalSceneList = styled.div`
    width: 100%;
    display: flex;
    gap: 16px;
    overflow-x: hidden;
    padding: 4px 0;
    scroll-snap-type: x mandatory;

    &::-webkit-scrollbar {
        height: 4px;
    }
    &::-webkit-scrollbar-thumb {
        background: var(--theme-grey-bg-secondary);
        border-radius: 2px;
    }

    /* gap: 16px (above) means N items + (N-1) gaps fill 100%:
         4 items → each = (100% - 3·16) / 4 = 25% - 12px
         2 items → each = (100% - 1·16) / 2 = 50% - 8px
       The previous values (25% - 6px / 50% - 4px) undercounted the gap
       contribution and pushed the 4th card past the container's right
       edge, which "hidden-scroll" then clipped. */
    > * {
        flex: 0 0 calc(25% - 12px);
        min-width: 200px;
        scroll-snap-align: start;
    }

    @media only screen and (max-width: 1280px) {
        > * { flex: 0 0 calc(50% - 8px); }
    }
    @media only screen and (max-width: 480px) {
        > * { flex: 0 0 85%; min-width: 260px; }
    }
`;

export const EmptyInfo = styled.div`
    color: #f8fafccc;
    font-size: 16px;
    margin-top: 16px;
`;
