import styled from "styled-components";

export const Wrapper = styled.div<{$right?: boolean}>`
    position: fixed;
    top: 50%;
    ${({$right}) => $right ? `right: 12px;` : `left: 12px;`}
    transform: translateY(-50%);

    background: #00000066;
    backdrop-filter: blur(30px);

    border-radius: 24px;
    z-index: 1000;
    border: none;
    pointer-events: all;

    .StyledCombobox .combobox-input {
        background: var(--theme-container-milky) !important;
    }
`;
