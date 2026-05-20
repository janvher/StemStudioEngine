import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";
import {TextInput} from "../../common/TextInput";

/*
 * Panel-content styles shared by the CodeEditor's right-panel kind views
 * (BehaviorPanel, LambdaPanel, FilePanel).
 */

export const SectionTitle = styled.div`
    ${flexCenter};
    justify-content: space-between;
    cursor: pointer;
    width: 100%;
    height: 40px;
    padding: 12px 8px 0;
    margin-bottom: -4px;
    .title {
        ${regularFont("s")}
        font-weight: var(--theme-font-medium-plus);
    }
`;

export const DetailsData = styled.div`
    border-bottom: 1px solid var(--theme-grey-bg);
    padding: 0 8px 12px;
    ${flexCenter};
    width: 100%;
    flex-direction: column;
    justify-content: flex-start;
    row-gap: 8px;
`;

export const Property = styled.div<{$isSwitch?: boolean; $fullWidth?: boolean}>`
    ${flexCenter};
    align-items: flex-start;
    flex-direction: column;
    row-gap: 8px;
    flex: 1 1 75px;
    min-width: 75px;
    max-width: 100%;

    ${({$isSwitch}) =>
        $isSwitch &&
        `
    max-width: max-content;
    min-width: max-content;
    width: max-content;
    flex: 1 1 max-content;
    padding-right: 2px;
`};
    ${({$fullWidth}) =>
        $fullWidth &&
        `
    max-width: 100%;
    min-width: 100%;
    width: 100%;
    flex: 1 1 100%;
`};

    .SwitchComponent {
        width: 40px;
        input:checked + .slider:before {
            -webkit-transform: translate(25px, -50%);
            -ms-transform: translate(25px, -50%);
            transform: translate(25px, -50%);
            background-color: #fafafa;
        }
    }
`;

export const Label = styled.label`
    display: block;
    ${regularFont("s")};
    color: #a1a1aa;
`;

export const Input = styled(TextInput)<{$editMode?: boolean}>`
    width: 100%;
    height: 24px;
    color: white;

    ${({$editMode}) =>
        $editMode &&
        `
    border: 1px solid var(--theme-container-active-blue);
    `}
`;

export const ExpandButton = styled.button<{$expanded: boolean}>`
    width: 24px;
    height: 24px;
    ${flexCenter};
    img {
        width: 16px;
        height: 16px;
        transition: 0.3s;
        ${({$expanded}) => $expanded && `transform: rotate(180deg)`};
    }
`;

export const ReadOnlyInput = styled(TextInput)`
    width: 100%;
    height: 24px;
    color: #888888;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: text;

    &:hover {
        border-color: rgba(255, 255, 255, 0.2);
    }
`;
