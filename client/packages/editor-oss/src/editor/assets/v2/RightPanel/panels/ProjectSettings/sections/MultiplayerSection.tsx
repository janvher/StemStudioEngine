import React from "react";

import {ContentItem} from "../../../common/ContentItem";
import {NumericInputRow} from "../../../common/NumericInputRow";
import {PanelCheckbox} from "../../../common/PanelCheckbox";
import {PanelSectionTitle} from "../../../RightPanel.style";

interface MultiplayerProps {
    isMultiplayer: boolean;
    multiplayerAutoJoin: boolean;
    maxMultiplayerClientsPerRoom: number;
    onBooleanChange: (key: string, setter: (value: boolean) => void) => void;
    onMaxClientsChange: (value: number) => void;
    setIsMultiplayer: (value: boolean) => void;
    setMultiplayerAutoJoin: (value: boolean) => void;
}

const MultiplayerSectionComponent = ({
    isMultiplayer,
    multiplayerAutoJoin,
    maxMultiplayerClientsPerRoom,
    onBooleanChange,
    onMaxClientsChange,
    setIsMultiplayer,
    setMultiplayerAutoJoin,
}: MultiplayerProps) => {
    return (
        <ContentItem $rowGap="12px">
            <PanelSectionTitle>Multiplayer</PanelSectionTitle>
            <PanelCheckbox
                v2
                text="Multiplayer"
                checked={isMultiplayer}
                isGray
                regular
                onChange={() => onBooleanChange("isMultiplayer", setIsMultiplayer)}
            />
            {isMultiplayer && 
                <>
                    <PanelCheckbox
                        v2
                        text="Auto join on start"
                        checked={multiplayerAutoJoin}
                        isGray
                        regular
                        disabled={!isMultiplayer}
                        onChange={() => onBooleanChange("multiplayerAutoJoin", setMultiplayerAutoJoin)}
                    />
                    <NumericInputRow
                        label="Max Clients per Room"
                        value={maxMultiplayerClientsPerRoom}
                        setValue={onMaxClientsChange}
                        rightAlign
                        $margin="0"
                        min={2}
                    />
                </>
            }
        </ContentItem>
    );
};

export const MultiplayerSection = React.memo(MultiplayerSectionComponent);
