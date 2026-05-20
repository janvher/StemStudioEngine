import {BottomBar} from "./ModelPreview.style";
import {StyledButton} from "../../../../common/StyledButton";

interface Props {
    warnings: string[];
    polygonCount: number;
    isLoading: boolean;
    hasMoreModels?: boolean;
    handleSave?: () => void;
    handleSkip?: () => void;
    handleCancel: () => void;
}

export const ModelPreviewFooter: React.FC<Props> = ({warnings, polygonCount, isLoading, hasMoreModels, handleSave, handleSkip, handleCancel}) => {
    const buttonText = hasMoreModels ? "Upload and Review next" : "Upload";

    return (
        <BottomBar>
            {warnings.map((msg, idx) =>
                <p key={idx}>{msg}</p>,
            )}
            <p>Current Polycount: {polygonCount}</p>
            <StyledButton
                isGreySecondary
                onClick={handleCancel}
                style={{zIndex: 100, fontWeight: "var(--theme-font-medium-plus)"}}
            >
                Cancel
            </StyledButton>
            {!isLoading && hasMoreModels && handleSkip &&
                <StyledButton
                    isGreySecondary
                    onClick={handleSkip}
                    style={{fontWeight: "var(--theme-font-medium-plus)"}}
                >
                    Skip
                </StyledButton>
            }
            {!isLoading && handleSave &&
                <StyledButton
                    isBlue
                    onClick={handleSave}
                    disabled={isLoading}
                    style={{fontWeight: "var(--theme-font-medium-plus)"}}
                >
                    {buttonText}
                </StyledButton>
            }
        </BottomBar>
    );
};
