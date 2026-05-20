import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {Item} from "../../../common/BasicCombobox/BasicCombobox";
import {InputSymbol} from "../../../common/InputSymbol";
import {Wrapper, Box, BoxInputs, InputWrapper} from "../../../common/MovementSection/MovementSection.style";
import {NumericInput} from "../../../common/NumericInput";
import {BouncinessPreset, CollisionType, PhysicsConfig} from "../../../types/physics";
import {NumericInputRow} from "../../common/NumericInputRow";
import {SelectRow} from "../../common/SelectRow";
import {PanelSectionTitleSecondary} from "../../RightPanel.style";
import {IPhysicsHandler} from "../PhysicsSection";

type Props = {
    handlePhysicsChange: (arg: IPhysicsHandler) => void;
    physics: PhysicsConfig;
    isLocked?: boolean;
    bouncinessPresetOptions: Item[];
    handleBouncinessPresetChange: (value: BouncinessPreset) => void;
    collisionMaterialOptions: Item[];
    handleCollisionMaterialChange: (value: string) => void;
    section: "massInertia" | "bounciness";
};

export const PhysicsNumericInput = ({
    handlePhysicsChange,
    physics,
    isLocked,
    bouncinessPresetOptions,
    handleBouncinessPresetChange,
    section,
}: Props) => {
    const app = global.app as EngineRuntime;
    const editor = app?.editor;
    const selected = editor?.selected;

    const handleNestedPhysicsChange = (value: number | string, name: keyof PhysicsConfig, sub: string) => {
        if (selected && !(selected instanceof Array)) {
            const nestedPhysics = selected.userData.physics[name];
            selected.userData.physics = {
                ...selected.userData.physics,
                [name]: {
                    ...nestedPhysics,
                    [sub]: value,
                },
            };
            app?.call(`objectChanged`, selected, selected);
        }
    };

    const isCustomPreset = physics.bounciness_preset === BouncinessPreset.CUSTOM;


    // Only shown when Custom preset is selected
    const customOnlyInputs: {label: string; name: keyof PhysicsConfig}[] = [
        {label: "Friction", name: "friction"},
        {label: "Contact Stiffness", name: "contactStiffness"},
        {label: "Contact Damping", name: "contactDamping"},
    ];

    // Section: massInertia - renders Mass and Inertia
    if (section === "massInertia") {
        return (
            <>
                {physics.ctype !== CollisionType.Static && 
                    <>
                        {physics.ctype !== CollisionType.Kinematic && 
                            <NumericInputRow
                                label="Mass"
                                value={physics.mass}
                                setValue={value => handlePhysicsChange({value, name: "mass"})}
                                disabled={isLocked}
                                $margin="0"
                            />
                        }

                        <Wrapper>
                            <Box>
                                <PanelSectionTitleSecondary style={{marginRight: "auto"}}>
                                    Inertia
                                </PanelSectionTitleSecondary>
                                <BoxInputs>
                                    {(["x", "y", "z"] as const).map(axis => 
                                        <InputWrapper key={axis}>
                                            <InputSymbol
                                                isLocked={!!isLocked}
                                                symbol={axis.toUpperCase()}
                                                value={physics.inertia[axis]}
                                                setValue={value => handleNestedPhysicsChange(value, "inertia", axis)}
                                            />
                                            <NumericInput
                                                value={physics.inertia[axis]}
                                                setValue={value => handleNestedPhysicsChange(value, "inertia", axis)}
                                                className="dark-input"
                                                disabled={isLocked}
                                            />
                                        </InputWrapper>,
                                    )}
                                </BoxInputs>
                            </Box>
                        </Wrapper>
                    </>
                }
            </>
        );
    }

    // Section: bounciness - renders Bounce Type and custom fields if applicable
    return (
        <>
            {/* Bounce Type dropdown */}
            <SelectRow
                label="Bounce Type"
                $margin="0"
                data={bouncinessPresetOptions}
                value={bouncinessPresetOptions?.find(item => item.value === physics.bounciness_preset)}
                onChange={item =>
                    !isLocked ? handleBouncinessPresetChange(item.value as BouncinessPreset) : undefined
                }
            />

            {/* Custom fields - only when Custom preset is selected */}
            {isCustomPreset && 
                <>
                    <NumericInputRow
                        label="Bounciness"
                        value={physics.restitution}
                        setValue={value => handlePhysicsChange({value, name: "restitution"})}
                        disabled={isLocked}
                        $margin="0"
                    />
                    {customOnlyInputs.map(({label, name}) => 
                        <NumericInputRow
                            key={name}
                            label={label}
                            value={physics[name] as number}
                            setValue={value => handlePhysicsChange({value, name})}
                            disabled={isLocked}
                            $margin="0"
                        />,
                    )}
                </>
            }
        </>
    );
};
