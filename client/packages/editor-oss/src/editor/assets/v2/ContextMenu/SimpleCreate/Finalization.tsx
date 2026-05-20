import {Prompt, SubmitButton} from "../ContextMenu.styles";

type Props = {
    handleAddAnother: () => void;
    handleCreate: () => void;
    handleFinished: () => void;
};

export const Finalization = ({handleAddAnother, handleCreate, handleFinished}: Props) => {
    return (
        <>
            <SubmitButton onClick={handleAddAnother}>Add Another</SubmitButton>
            <SubmitButton $isSecondary
                $isDark
                onClick={handleCreate}
            >
                Retry
            </SubmitButton>
            <SubmitButton $isSecondary
                $isDark
                onClick={handleFinished}
            >
                Done
            </SubmitButton>
        </>
    );
};
