import {useEffect, useMemo, useRef, useState} from "react";
import styled from "styled-components";

import {useEscapeDismiss} from "./hooks/useEscapeDismiss";
import {ModalBackdrop} from "./ModalBackdrop";
import {ModalCloseButton} from "./ModalCloseButton";
import {StyledButton} from "./StyledButton";
import {modalContainerStyles} from "./styles";
import {regularFont} from "../../../../assets/style";

const Container = styled.div`
    width: 420px;
    ${modalContainerStyles};
`;

const Header = styled.div`
    padding: 16px 20px 8px;
    position: relative;
`;

const Title = styled.div`
    ${regularFont("s")};
    font-weight: 600;
`;

const Subtitle = styled.div`
    ${regularFont("s")};
    color: var(--theme-font-main-color);
    opacity: 0.7;
    margin-top: 4px;
    font-size: 12px;
`;

const VariantList = styled.div`
    padding: 8px 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 300px;
    overflow-y: auto;
`;

const VariantItem = styled.div<{$selected: boolean}>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    border: 2px solid ${({$selected}) => ($selected ? "white" : "transparent")};
    background: ${({$selected}) => ($selected ? "rgba(255,255,255,0.08)" : "transparent")};
    &:hover {
        background: rgba(255, 255, 255, 0.06);
    }
`;

const Thumbnail = styled.img`
    width: 48px;
    height: 48px;
    border-radius: 4px;
    object-fit: cover;
    background: rgba(0, 0, 0, 0.3);
`;

const VariantName = styled.span`
    ${regularFont("s")};
    flex: 1;
`;

const Footer = styled.div`
    padding: 12px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;


interface TextureVariantDialogProps {
    variants: File[];
    onConfirm: (selected: File) => void;
    onCancel: () => void;
}

export const TextureVariantDialog = ({variants, onConfirm, onCancel}: TextureVariantDialogProps) => {
    const [selected, setSelected] = useState<File>(variants[0]!);
    const containerRef = useRef<HTMLDivElement>(null);

    const thumbUrls = useMemo(() => {
        const map = new Map<File, string>();
        for (const file of variants) {
            map.set(file, URL.createObjectURL(file));
        }
        return map;
    }, [variants]);

    useEffect(() => {
        return () => {
            for (const url of thumbUrls.values()) {
                URL.revokeObjectURL(url);
            }
        };
    }, [thumbUrls]);

    useEscapeDismiss({onEscape: onCancel});

    return (
        <ModalBackdrop onClick={onCancel}>
            <Container ref={containerRef}
                onClick={e => e.stopPropagation()}
            >
                <Header>
                    <Title>Select Texture Variant</Title>
                    <Subtitle>
                        Multiple texture variants found. Choose which to apply to all models.
                    </Subtitle>
                    <ModalCloseButton onClick={onCancel} />
                </Header>
                <VariantList>
                    {variants.map(file => (
                        <VariantItem
                            key={file.name}
                            $selected={file === selected}
                            onClick={() => setSelected(file)}
                        >
                            <Thumbnail src={thumbUrls.get(file)} alt={file.name} />
                            <VariantName>{file.name}</VariantName>
                        </VariantItem>
                    ))}
                </VariantList>
                <Footer>
                    <StyledButton width="80px" isGreySecondary onClick={onCancel}>
                        Cancel
                    </StyledButton>
                    <StyledButton width="80px" isBlue onClick={() => onConfirm(selected)}>
                        Confirm
                    </StyledButton>
                </Footer>
            </Container>
        </ModalBackdrop>
    );
};
