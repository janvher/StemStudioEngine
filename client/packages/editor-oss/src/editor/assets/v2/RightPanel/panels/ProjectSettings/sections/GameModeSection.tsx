import React from "react";

import {StyledButton} from "../../../../common/StyledButton";
import {ContentItem} from "../../../common/ContentItem";
import {NumericInputRow} from "../../../common/NumericInputRow";
import {PanelCheckbox} from "../../../common/PanelCheckbox";
import {PanelSectionTitle} from "../../../RightPanel.style";

interface GameModeProps {
    isCollaborative: boolean;
    maxCollaboratorsInRoom: number;
    voiceChatEnabled: boolean;
    onBooleanChange: (key: string, setter: (value: boolean) => void) => void;
    onCollaborativeChange: (checked: boolean) => void;
    onMaxCollaboratorsChange: (value: number) => void;
    onOpenCollaborators: () => void;
    setVoiceChatEnabled: (value: boolean) => void;
}

const GameModeSectionComponent = ({
    isCollaborative,
    maxCollaboratorsInRoom,
    voiceChatEnabled,
    onBooleanChange,
    onCollaborativeChange,
    onMaxCollaboratorsChange,
    onOpenCollaborators,
    setVoiceChatEnabled,
}: GameModeProps) => {
    return (
        <ContentItem $rowGap="12px">
            <PanelSectionTitle>Collaboration</PanelSectionTitle>
            <PanelCheckbox
                v2
                text="Collaborative Mode"
                checked={isCollaborative}
                isGray
                regular
                onChange={() => onCollaborativeChange(!isCollaborative)}
                tooltipText="Allows multiple creators to edit this scene together in real time. Enable this only for shared editing workflows, since it changes how the project session is coordinated."
            />
            {isCollaborative &&
                <NumericInputRow
                    label="Max Collaborators in Room"
                    value={maxCollaboratorsInRoom}
                    setValue={onMaxCollaboratorsChange}
                    rightAlign
                    $margin="0"
                    min={1}
                    max={10}
                    dragStep={1}
                    labelTooltip="Maximum number of collaborators allowed in the same editing session. Typical teams stay around 2-6. Higher values increase coordination overhead more than they increase productivity."
                />
            }
            <StyledButton
                style={{fontWeight: "400"}}
                isGreySecondary
                onClick={onOpenCollaborators}
                disabled={!isCollaborative}
            >
                Collaborators
            </StyledButton>
            <PanelCheckbox
                v2
                text="Voice Chat Integration"
                checked={voiceChatEnabled}
                isGray
                regular
                onChange={() => onBooleanChange("voiceChatEnabled", setVoiceChatEnabled)}
                tooltipText="Enables built-in voice communication support for collaborative or multiplayer experiences. Turn this on only if voice is part of the intended workflow or gameplay."
            />
        </ContentItem>
    );
};

export const GameModeSection = React.memo(GameModeSectionComponent);
