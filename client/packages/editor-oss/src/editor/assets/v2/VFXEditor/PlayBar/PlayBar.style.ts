import styled from "styled-components";

import {Container as SceneActionBarContainer, ActionButton as SceneActionButton} from "../../ActionBar/ActionBar.style";

export const Bar = styled(SceneActionBarContainer)`
    position: fixed;
    z-index: 101;
    pointer-events: all;
`;

export const Button = styled(SceneActionButton)`
    padding: 8px;

    img {
        width: 100%;
        height: 100%;
    }
`;
