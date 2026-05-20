import { DefaultDarkColors, MisMerge2 } from '@mismerge/react';
import { useEffect } from 'react';
import '@mismerge/core/styles.css';
import '@mismerge/core/dark.css';

import {useEscapeDismiss} from "../../common/hooks/useEscapeDismiss";
import { StyledButton } from '../../common/StyledButton';
import closeIcon from "../../icons/close-panel.svg";
import { ButtonsWrapper } from '../CodeEditor/CodeEditor.style';
import { Context, EditorContainer, Header, HeaderCloseButton, Overlay } from '../BehaviorCreator/TextMergeModal/TextMergeModal.style';

type TextDiffModalProps = {
    oldText: string;
    newText: string;
    isOpen: boolean;
    onClose: () => void;
};

export const TextDiffModal = ({
    oldText,
    newText,
    isOpen,
    onClose,
}: TextDiffModalProps) => {
    useEscapeDismiss({onEscape: onClose, enabled: isOpen});

    useEffect(() => {
        if (!isOpen) return;

        const connector = document.querySelector('.msm__connector');
        connector?.remove();
    }, [isOpen]);

    if (!isOpen) return null;
    return (
        <Overlay onClick={e => e.stopPropagation()}>
            <Context onClick={e => e.stopPropagation()}>
                <Header>
                    <span className="heading">Behavior Compare</span>
                    <ButtonsWrapper>
                        <HeaderCloseButton className="reset-css"
                            onClick={onClose}
                        >
                            <img src={closeIcon}
                                alt="close"
                            />
                        </HeaderCloseButton>
                        <StyledButton
                            isGrey
                            onClick={onClose}
                        >
                            Close
                        </StyledButton>
                    </ButtonsWrapper>
                </Header>

                <EditorContainer>
                    <MisMerge2
                        lhs={oldText}
                        rhs={newText}
                        lhsEditable={false}
                        rhsEditable={false}
                        disableMerging
                        colors={DefaultDarkColors}
                        wrapLines
                    />
                </EditorContainer>
            </Context>
        </Overlay>
    );
};
