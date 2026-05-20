import {GenerateButton} from "../common/GenerateButton";
import {Prompt} from "../ContextMenu.styles";

type Props = {
    isOpen: boolean;
    prompt: string;
    setPrompt: (prompt: string) => void;
    isRequesting: boolean;
    loading: boolean;
    handleSubmit: () => Promise<void>;
    placeholder?: string;
};

export const PromptStep = ({isOpen, prompt, setPrompt, isRequesting, loading, handleSubmit, placeholder}: Props) => {
    if (!isOpen) return null;

    return (
        <>
            <Prompt
                placeholder={placeholder || "What would you like to Create?"}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
            />
            <GenerateButton disabled={!prompt || isRequesting || loading}
                onClick={handleSubmit}
            />
        </>
    );
};
