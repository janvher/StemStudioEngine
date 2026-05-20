import * as THREE from "three";
import {IfConditionInterface} from "@stem/editor-oss/types/editor";

export interface IOptions {
    key: string;
    value: string;
    uuid?: string;
    label?: string;
}

const generateEmptyTrigger = (): IfConditionInterface => ({
    id: THREE.MathUtils.generateUUID(),
    player_touches: true,
    object_touches: false,
    pressE: false,
});
import {StyledButton} from "../../../common/StyledButton";
import {PlusRow} from "../../common/PlusRow";
import {SelectionOfButtons} from "../../common/SelectionOfButtons";
import {SelectRow} from "../../common/SelectRow";
import {Separator} from "../../common/Separator";

interface IButtonArguments {
    onPlayer?: boolean;
    onObject?: boolean;
    onKey?: boolean;
    objectUUID?: string;
}

interface IfStatementProps {
    ifObject: IfConditionInterface;
    handleIfChange: (value: IfConditionInterface, newIf: boolean) => void;
    objectOptions: IOptions[];
}

export const IfStatement = ({handleIfChange, ifObject, objectOptions}: IfStatementProps) => {
    const handleButtons = (args: IButtonArguments) => {
        const {onPlayer, onObject, onKey, objectUUID} = args;
        handleIfChange(
            {
                id: ifObject.id,
                player_touches: !!onPlayer,
                object_touches: !!onObject,
                pressE: !!onKey,
                objectUUID,
            },
            false,
        );
    };

    const addIfCondition = () => {
        const newiIf = generateEmptyTrigger();
        handleIfChange(newiIf, true);
    };

    return (
        <SelectionOfButtons justifyContent="flex-start">
            <StyledButton
                width="109px"
                isBlue={ifObject.player_touches}
                isActive={!ifObject.player_touches}
                onClick={() => handleButtons({onPlayer: true})}
            >
                <span>Player Touches</span>
            </StyledButton>
            <StyledButton
                width="calc(50% - 3px)"
                isBlue={ifObject.object_touches}
                isActive={!ifObject.object_touches}
                onClick={() => handleButtons({onObject: true, objectUUID: ""})}
            >
                <span>Object Touches</span>
            </StyledButton>
            <StyledButton
                width="calc(50% - 3px)"
                isBlue={ifObject.pressE}
                isActive={!ifObject.pressE}
                onClick={() => handleButtons({onKey: true})}
            >
                <span>Press E Key</span>
            </StyledButton>
            {ifObject.object_touches && 
                <SelectRow
                    $margin={"8px 0 0"}
                    label="Object Name"
                    value={objectOptions.find(el => el.uuid === ifObject.objectUUID)}
                    onChange={item => handleButtons({objectUUID: item.uuid, onObject: true})}
                    data={objectOptions}
                />
            }
            <Separator margin="0"
                invisible
            />
            <PlusRow label="Add another If Statement"
                callback={addIfCondition}
            />
            <Separator margin="4px 0 -4px" />
        </SelectionOfButtons>
    );
};
