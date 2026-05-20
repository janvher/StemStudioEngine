import {marked} from "marked";
import {forwardRef, useMemo} from "react";

import {Panel, PanelHeader, PanelTitle, CloseButton, MarkdownContent, DocTextarea} from "./BehaviorDocumentationPanel.style";

const STEM_AUTHOR = ".erth";

interface Props {
    documentation: string;
    behaviorName: string;
    author?: string;
    onClose: () => void;
    onDocumentationChange?: (value: string) => void;
    style?: React.CSSProperties;
}

type PanelRef = HTMLDivElement;

export const BehaviorDocumentationPanel = forwardRef<PanelRef, Props>(
    ({documentation, behaviorName, author, onClose, onDocumentationChange, style}, ref) => {
        const isBuiltIn = author === STEM_AUTHOR;

        const htmlContent = useMemo(() => {
            if (!isBuiltIn || !documentation) return "";
            const normalizedDocumentation = documentation.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");
            return marked.parse(normalizedDocumentation, { gfm: true, breaks: true }) as string;
        }, [documentation, isBuiltIn]);

        return (
            <Panel ref={ref}
                style={style}
            >
                <PanelHeader>
                    <PanelTitle>{behaviorName} Info</PanelTitle>
                    <CloseButton onClick={onClose}>
                        <svg width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M1 1L9 9M9 1L1 9"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </CloseButton>
                </PanelHeader>

                {isBuiltIn ? 
                    <MarkdownContent dangerouslySetInnerHTML={{__html: htmlContent}} />
                 : 
                    <DocTextarea
                        value={documentation}
                        placeholder="Add documentation for this behavior..."
                        onChange={e => onDocumentationChange?.(e.target.value)}
                    />
                }
            </Panel>
        );
    },
);
