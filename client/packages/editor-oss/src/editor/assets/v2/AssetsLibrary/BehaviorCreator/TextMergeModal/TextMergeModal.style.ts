import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../assets/style";
import {ModalContent, ModalHeader} from "../../CodeEditor/CodeEditor.style";

export const Overlay = styled.div`
    z-index: 10000;
    ${flexCenter};

    position: fixed;
    top: 50vh;
    left: 50vw;
    transform: translate(-50%, -50%);
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
`;

export const Context = styled(ModalContent)`
    display: flex;
    flex-direction: column;
    width: 90vw;
    height: 80vh;
`;

export const Header = styled(ModalHeader)`
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

export const HeaderCloseButton = styled.button`
    margin-right: 8px;

    img {
        width: 13px;
        height: auto;
    }
`;

export const Instructions = styled.div`
    ${regularFont("s")};
    padding: 8px;
    color: #a1a1aa;
`;

export const EditorContainer = styled.div`
    flex: 1 1 auto;
    display: flex;
    width: 100%;
    min-height: 400px;

    mis-merge2,
    mis-merge3 {
        flex: 1; /* Makes the web component expand to fill container */
        width: 100%;
    }

    /* Added */
    .mismerge .msm__block.added,
    .mismerge .msm__line-number.added {
        background-color: #314f33;
    }

    /* Removed */
    .mismerge .msm__block.removed,
    .mismerge .msm__line-number.removed {
        background-color: #461717;
    }

    /* Conflict */
    .mismerge .msm__block.conflict,
    .mismerge .msm__line-number.conflict {
        background-color: #461717;
    }

    /* Resolved Conflict */
    .mismerge .msm__block.resolved-conflict,
    .mismerge .msm__line-number.resolved-conflict {
        background-color: #2c3e69;
    }

    /* Modified */
    .mismerge .msm__block.modified,
    .mismerge .msm__line-number.modified {
        background-color: #2a3f4d;
    }

    /* Modified Overlay */
    .mismerge .msm__block.modified .overlay {
        background-color: #30556e;
    }
    /* Added / Removed / Conflict placeholders overlay */
    .mismerge .added-placeholder {
        background-color: #314f33;
    }
    .mismerge .removed-placeholder {
        background-color: #461717;
    }
    .mismerge .conflict-placeholder {
        background-color: #461717;
    }
    .mismerge .resolved-conflict-placeholder {
        background-color: #2c3e69;
    }
`;
// mismerge theme:
//     --added: #314f33;
//     --removed: #461717;
//     --conflict: #461717;
//     --resolved-conflict: #2c3e69;
//     --modified: #2a3f4d;
//     --modified-overlay: #30556e;
