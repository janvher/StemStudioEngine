import styled from "styled-components";

import {useEscapeDismiss} from "./hooks/useEscapeDismiss";
import {ModalBackdrop} from "./ModalBackdrop";
import {ModalCloseButton} from "./ModalCloseButton";
import {CommonButton} from "./StyledButton";
import {modalContainerStyles} from "./styles";
import {regularFont} from "../../../../assets/style";

const TEXTURE_ACCEPT = "image/*,.tga,.tif,.tiff,.dds,.ktx,.ktx2,.hdr,.exr";

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

const Footer = styled.div`
    padding: 12px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const FileLabel = styled.label`
    display: inline-block;
    cursor: pointer;
`;


interface MissingTextureDialogProps {
    onSelectTextures: (files: File[]) => void;
    onContinue: () => void;
    onCancel: () => void;
}

export const MissingTextureDialog = ({onSelectTextures, onContinue, onCancel}: MissingTextureDialogProps) => {
    useEscapeDismiss({onEscape: onCancel});

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onSelectTextures(Array.from(files));
        }
    };

    return (
        <ModalBackdrop onClick={onCancel}>
            <Container onClick={e => e.stopPropagation()}>
                <Header>
                    <Title>Missing Textures</Title>
                    <Subtitle>
                        This model references textures that weren&apos;t included. You can select texture files to
                        apply, or continue without them.
                    </Subtitle>
                    <ModalCloseButton onClick={onCancel} />
                </Header>
                <Footer>
                    <CommonButton $isGreySecondary $width="120px" onClick={onContinue}>
                        Continue Without
                    </CommonButton>
                    <FileLabel>
                        <CommonButton as="span" $isBlue $width="120px">
                            Select Textures
                        </CommonButton>
                        <input
                            type="file"
                            accept={TEXTURE_ACCEPT}
                            multiple
                            style={{display: "none"}}
                            onChange={handleFileChange}
                        />
                    </FileLabel>
                </Footer>
            </Container>
        </ModalBackdrop>
    );
};
