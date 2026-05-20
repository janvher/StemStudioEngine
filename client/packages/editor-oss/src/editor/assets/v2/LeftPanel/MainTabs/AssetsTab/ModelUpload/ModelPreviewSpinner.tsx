import { Container } from "./ModelPreview.style";
import { ModelPreviewFooter } from "./ModelPreviewFooter";
import GradientSpinner from '@web-shared/player/component/GradientSpinner';

type ModelPreviewSpinnerProps = {
    onClose: () => void;
};

export const ModelPreviewSpinner = ({
    onClose,
}: ModelPreviewSpinnerProps) => {
    return (
        <Container>
            <GradientSpinner />
            <ModelPreviewFooter
                warnings={[]}
                polygonCount={0}
                isLoading
                handleSave={undefined}
                handleCancel={onClose}
            />
        </Container>
    );
};
