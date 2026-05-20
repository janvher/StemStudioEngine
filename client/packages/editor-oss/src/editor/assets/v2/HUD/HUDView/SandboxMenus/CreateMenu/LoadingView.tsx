import {ClipLoader} from "react-spinners";

import {LoadingContainer, LoadingText, MilkyButton} from "./CreateMenu.style";

interface Props {
    onCancel: () => void | undefined;
}

export const LoadingView = ({onCancel}: Props) => {
    return (
        <>
            <LoadingContainer>
                <ClipLoader
                    loading
                    size={40}
                    color="#fff"
                    aria-label="Loading Spinner"
                />
                <LoadingText>Generating...</LoadingText>
            </LoadingContainer>
            <MilkyButton onClick={onCancel}>Cancel</MilkyButton>
        </>
    );
};
