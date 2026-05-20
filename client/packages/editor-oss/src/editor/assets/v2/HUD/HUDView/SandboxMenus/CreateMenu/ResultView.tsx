import { FlexWrapper, MilkyButton, ResultContainer, ResultPreview, Text } from "./CreateMenu.style";

interface Props {
    goBack: () => void;
    onRetry: () => void;
    prompt: string;
    thumbnailUrl?: string | null;
    errorMessage: string | null;
}

export const ResultView = ({ goBack, onRetry, prompt, thumbnailUrl, errorMessage }: Props) => {
    return (
        <ResultContainer>
            {!errorMessage && <Text>Complete!</Text>}
            {thumbnailUrl && 
                <ResultPreview>
                    <img className={"thumbnail"}
                        src={thumbnailUrl}
                    />
                </ResultPreview>
            }

            <Text style={{ marginTop: "-4px" }}>{prompt}</Text>
            {errorMessage && <Text style={{ color: "red" }}>{errorMessage}</Text>}
            <FlexWrapper>
                <MilkyButton onClick={onRetry}>Retry</MilkyButton>
                <MilkyButton onClick={goBack}>Back to Create</MilkyButton>
            </FlexWrapper>
        </ResultContainer>
    );
};
