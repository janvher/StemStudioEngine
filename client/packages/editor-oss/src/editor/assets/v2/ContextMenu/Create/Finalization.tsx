import {FollowUpMessage, Prompt, SubmitButton} from "../ContextMenu.styles";

type Props = {
    followUpMessage: string;
    prompt: string;
    setPrompt: (prompt: string) => void;
    handleCreate: () => void;
    handleFinished: () => void;
};

export const Finalization = ({followUpMessage, prompt, setPrompt, handleCreate, handleFinished}: Props) => {
    return (
        <>
            <FollowUpMessage>{followUpMessage}</FollowUpMessage>
            <Prompt placeholder=""
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
            />
            <SubmitButton onClick={handleCreate}
                disabled={!prompt}
            >
                Create
            </SubmitButton>
            <SubmitButton onClick={handleFinished}
                $isDark
            >
                Finished
            </SubmitButton>
        </>
    );
};
