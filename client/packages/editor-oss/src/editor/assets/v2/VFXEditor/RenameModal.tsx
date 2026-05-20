import { useState } from "react";

import { DetailsPopup } from "../common/DetailsPopup/DetailsPopup";

interface Props {
    defaultName: string;
    onSave: (name: string) => void;
    onContinue?: () => void
    onCancel: () => void
    popupTitle?: string
}

export const RenameModal = ({ defaultName, onSave, onContinue, onCancel, popupTitle }: Props) => {
    const [name, setName] = useState(defaultName);

    return (
        <DetailsPopup
            title={popupTitle || "Rename New VFX Effect before saving?"}
            textInputData={{ label: "Name", value: name, setValue: setName }}
            saveDisabled={!name}
            onSave={() => onSave(name)}
            customButton={onContinue ? { label: "Continue", onClick: onContinue } : undefined}
            onCancel={onCancel}
            style={{ width: "280px" }}
        />
    );
};
