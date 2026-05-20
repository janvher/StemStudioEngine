import {useState} from "react";

import {showToast} from "@stem/editor-oss/showToast";
import {DetailsPopup} from "../../../common/DetailsPopup/DetailsPopup";
import {INewBehaviorData} from "../types";

interface NewBehaviorPopupProps {
    onCancel: () => void;
    onCreateNewBehavior: (args: INewBehaviorData) => Promise<void>;
}

export const NewBehaviorPopup = ({
    onCreateNewBehavior,
    onCancel,
}: NewBehaviorPopupProps) => {
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [hasFailed, setHasFailed] = useState(false);

    const isValidConfig = !!newName;

    const handleCreate = async () => {
        if (!isValidConfig) return showToast({type: "error", title: "Name is required"});

        setIsCreating(true);
        setHasFailed(false);
        try {
            await onCreateNewBehavior({name: newName, description: newDescription});
            // Popup closing is handled by the parent on success
        } catch (error) {
            console.error("Error creating behavior:", error);
            setHasFailed(true);
        } finally {
            setIsCreating(false);
        }
    };

    const saveLabel = isCreating ? "Creating..." : hasFailed ? "Retry" : undefined;

    return (
        <DetailsPopup
            title="Behavior Details"
            textInputData={{label: "Name", value: newName, setValue: setNewName}}
            textareaData={{label: "Description", value: newDescription, setValue: setNewDescription}}
            saveDisabled={!isValidConfig || isCreating}
            onSave={handleCreate}
            onCancel={onCancel}
            saveLabel={saveLabel}
            errorMessage={hasFailed ? "Failed to create behavior. Please try again." : undefined}
        />
    );
};
