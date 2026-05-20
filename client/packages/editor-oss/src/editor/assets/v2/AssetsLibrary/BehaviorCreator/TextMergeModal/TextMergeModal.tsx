import { DefaultDarkColors, MisMerge3 } from '@mismerge/react';
import { useEffect, useState } from 'react';
import '@mismerge/core/styles.css';
import '@mismerge/core/dark.css';

import { Context, EditorContainer, Header, HeaderCloseButton, Instructions, Overlay } from './TextMergeModal.style';
import {useEscapeDismiss} from "../../../common/hooks/useEscapeDismiss";
import { StyledButton } from '../../../common/StyledButton';
import closeIcon from "../../../icons/close-panel.svg";
import warningIcon from "../../images/warning.svg";
import { ButtonsWrapper } from '../../CodeEditor/CodeEditor.style';

type TextMergeModalProps = {
    baseText: string;      // Original revision the user started from
    localText: string;     // User's edited version
    latestText: string;    // Most recent upstream revision
    isOpen: boolean;
    onCancel: () => void;
    onSave: (mergedText: string) => void;
    /** Heading text shown in the modal header. Defaults to "Behavior Merge". */
    title?: string;
    /** Instruction text shown below the header. Defaults to behavior-specific text. */
    instructions?: string;
};

const DEFAULT_TITLE = "Behavior Merge";
const DEFAULT_INSTRUCTIONS =
    "There is a newer version of the asset. Please merge your " +
    "changes with the latest version. Below you will see three " +
    "versions: the original, your changes, and the latest version.";

export const TextMergeModal = ({
    baseText,
    localText,
    latestText,
    isOpen,
    onCancel,
    onSave,
    title = DEFAULT_TITLE,
    instructions = DEFAULT_INSTRUCTIONS,
}: TextMergeModalProps) => {
    const [centerText, setCenterText] = useState(localText);
    useEscapeDismiss({onEscape: onCancel, enabled: isOpen});

    useEffect(() => {
        setCenterText(localText);
    }, [localText]);

    if (!isOpen) return null;

    return (
        <Overlay onClick={e => e.stopPropagation()}>
            <Context onClick={e => e.stopPropagation()}>
                <Header>
                    <span className="heading">{title}</span>
                    <ButtonsWrapper>
                        <HeaderCloseButton className="reset-css"
                            onClick={onCancel}
                        >
                            <img src={closeIcon}
                                alt="close"
                            />
                        </HeaderCloseButton>
                        <StyledButton
                            isGrey
                            onClick={onCancel}
                        >
                            Cancel
                        </StyledButton>
                        <StyledButton
                            isBlue
                            onClick={() => onSave(centerText)}
                        >
                            Done
                        </StyledButton>
                    </ButtonsWrapper>
                </Header>

                <Instructions>
                    <img
                        src={warningIcon}
                        alt="warning"
                    />
                    {instructions}
                </Instructions>

                <EditorContainer>
                    <MisMerge3
                        lhs={baseText}
                        ctr={centerText}
                        rhs={latestText}
                        lhsEditable={false}
                        rhsEditable={false}
                        onCtrChange={setCenterText}
                        colors={DefaultDarkColors}
                        wrapLines
                    />
                </EditorContainer>
            </Context>
        </Overlay>
    );
};
