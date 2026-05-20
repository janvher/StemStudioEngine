import {useEffect, useState} from "react";

import {IOptions} from "./IfStatement";

type InputChangeType = (value: unknown, key: string, isElse?: boolean) => void;
import global from "@stem/editor-oss/global";
import {TriggerBehaviorInterface} from "@stem/editor-oss/types/editor";
import {StyledButton} from "../../../common/StyledButton";
import {PanelCheckbox} from "../../common/PanelCheckbox";
import {SelectionOfButtons} from "../../common/SelectionOfButtons";
import {SelectRow} from "../../common/SelectRow";
import {Separator} from "../../common/Separator";

interface CommonFieldsProps {
    objectOptions: IOptions[];
    handleInputChange: InputChangeType;
    behavior: TriggerBehaviorInterface;
    elseSelected?: boolean;
    objectsAvailable: any[];
    handleObjectTriggerChange: (isElseObject: boolean, behaviorType: any) => void;
}
export const CommonFields = ({
    objectOptions,
    handleInputChange,
    behavior,
    elseSelected,
    objectsAvailable,
    handleObjectTriggerChange,
}: CommonFieldsProps) => {
    const app = global.app;
    const editor = app?.editor;
    const behaviorActivate = elseSelected ? behavior.else_activate : behavior.then_activate;
    const behaviorObject = elseSelected ? behavior.else_object : behavior.then_object;
    const [showSavedSettings, setShowSavedSettings] = useState(true);
    const [savedBehavior, setSavedBehavior] = useState<TriggerBehaviorInterface>();

    useEffect(() => {
        if (objectsAvailable.length > 0 && behaviorObject) {
            const exist =
                !!savedBehavior?.then_object && !elseSelected || !!savedBehavior?.else_object && !!elseSelected;
            if (showSavedSettings && exist) {
                setShowSavedSettings(false);
                return;
            }

            const key = elseSelected ? "else_behaviors_on_trigger" : "then_behaviors_on_trigger";
            const obj = objectsAvailable.find(el => el.name === behaviorObject);
            if (obj) {
                if (savedBehavior && savedBehavior.then_object === obj.name) {
                    handleInputChange(savedBehavior.then_behaviors_on_trigger, "then_behaviors_on_trigger");
                    return;
                } else if (savedBehavior && savedBehavior.else_object === obj.name) {
                    handleInputChange(savedBehavior.else_behaviors_on_trigger, "else_behaviors_on_trigger");
                    return;
                }
                const getObject = obj.userData.ID ? editor?.modelByID(obj.userData.ID) : editor?.objectByUuid(obj.uuid);
                const array = getObject?.userData?.behaviors?.map((el: any) => {
                    return {[el.type]: el.startOnTrigger ?? false};
                });
                handleInputChange(array || [], key);
            } else {
                handleInputChange([], key);
            }
        }
    }, [objectsAvailable, behaviorObject]);

    useEffect(() => {
        setSavedBehavior({...behavior});
    }, []);

    return (
        <>
            <SelectionOfButtons>
                <StyledButton
                    width="calc(50% - 3px)"
                    isBlue={behaviorActivate}
                    isActive={!behaviorActivate}
                    onClick={() =>
                        handleInputChange(!behaviorActivate, elseSelected ? "else_activate" : "then_activate")
                    }
                >
                    <span>Activate</span>
                </StyledButton>
                <StyledButton
                    width="calc(50% - 3px)"
                    isBlue={!behaviorActivate}
                    isActive={behaviorActivate}
                    onClick={() =>
                        handleInputChange(!behaviorActivate, elseSelected ? "else_activate" : "then_activate")
                    }
                >
                    <span>De-Activate</span>
                </StyledButton>
            </SelectionOfButtons>
            <SelectRow
                $margin={"12px 0"}
                label="This Object"
                value={objectOptions.find(el => el.value === behaviorObject)}
                onChange={item => handleInputChange(item.value, elseSelected ? "else_object" : "then_object")}
                data={objectOptions}
            />
            {!elseSelected &&
                behavior.then_behaviors_on_trigger?.map(el => {
                    const key = Object.keys(el)[0];
                    const value = el[key as keyof typeof el];
                    return (
                        <div key={key}>
                            <PanelCheckbox
                                text={key}
                                checked={!!value}
                                onChange={() => handleObjectTriggerChange(false, key)}
                                v2
                            />
                            <Separator invisible
                                margin="12px 0 0"
                            />
                        </div>
                    );
                })}
            {elseSelected &&
                behavior.else_behaviors_on_trigger?.map(el => {
                    const key = Object.keys(el)[0];
                    const value = el[key as keyof typeof el];
                    return (
                        <div key={key}>
                            <PanelCheckbox
                                text={key}
                                checked={!!value}
                                onChange={() => handleObjectTriggerChange(true, key)}
                                v2
                            />
                            <Separator invisible
                                margin="12px 0 0"
                            />
                        </div>
                    );
                })}
        </>
    );
};
