import React, {useState, useReducer} from "react";
import styled from "styled-components";
import {
    AxisAngleGenerator,
    Behavior,
    BehaviorTypes,
    Bezier,
    ColorRange,
    ConstantValue,
    ParticleSystem,
    PiecewiseBezier,
    Vector3 as QuarksVector3,
    Vector4 as QuarksVector4,
} from "three.quarks";

import {ParticleBehaviorEditor} from "./ParticleBehaviorEditor";
import {StyledButton} from "../../../../../../../editor/assets/v2/common/StyledButton";
import global from "@stem/editor-oss/global";
import {Item} from "../../../../common/BasicCombobox/BasicCombobox";
import {SelectRow} from "../../../common/SelectRow";

const BehaviorsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const AddBehaviorSection = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    margin-bottom: 16px;

    .SelectRowWrapper {
        width: auto;
    }
`;

interface ParticleBehaviorsSectionProps {
    particleSystem: ParticleSystem;
    behaviors: Array<Behavior>;
}

export const ParticleBehaviorsSection: React.FC<ParticleBehaviorsSectionProps> = ({particleSystem, behaviors}) => {
    const app = global?.app;
    const editor = app?.editor;
    const [selectedBehaviorType, setSelectedBehaviorType] = useState<string | null>(null);
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    const updateProperties = () => {
        // Trigger update in the application
        if (app && editor?.selected) {
            app.call("objectChanged", editor, editor.selected);
            app.call("emitterUpdate");
        }
        forceUpdate();
    };

    const deleteBehavior = (index: number) => () => {
        behaviors.splice(index, 1);
        updateProperties();
    };

    const genDefaultBezier = () => new PiecewiseBezier([[new Bezier(0, 0.3333, 0.6667, 1.0), 0]]);
    const genDefaultColor = () =>
        new ColorRange(new QuarksVector4(1.0, 1.0, 1.0, 1.0), new QuarksVector4(0.0, 0.0, 0.0, 1.0));

    const onAddNewBehavior = () => {
        if (!selectedBehaviorType) return;

        const entry = BehaviorTypes[selectedBehaviorType];
        let behavior;

        if (entry) {
            const args: unknown[] = [];
            const params = entry.params as string[][];

            for (let i = 0; i < params.length; i++) {
                const paramType = params[i]?.[1];
                const arrOfTypes = Array.isArray(paramType) ? paramType : [paramType];

                arrOfTypes.forEach(type => {
                    switch (type) {
                        case "number":
                            args.push(1);
                            break;
                        case "vec3":
                            args.push(new QuarksVector3(1, 1, 1));
                            break;
                        case "rotationFunc":
                            args.push(new AxisAngleGenerator(new QuarksVector3(0, 1, 0), new ConstantValue(0)));
                            break;
                        case "valueFunc":
                            args.push(genDefaultBezier());
                            break;
                        case "value":
                            args.push(new ConstantValue(1));
                            break;
                        case "colorFunc":
                            args.push(genDefaultColor());
                            break;
                        case "boolean":
                            args.push(false);
                            break;
                        case "self":
                            args.push(particleSystem);
                            break;
                        case "particleSystem":
                        case "mesh":
                            args.push(undefined);
                            break;
                    }
                });
            }

            behavior = new entry.constructor(...args);
        }

        if (behavior) {
            behaviors.push(behavior);
            updateProperties();
        }

        const container = document.getElementById("VFXBehaviors");
        setTimeout(() => {
            container?.scrollIntoView({behavior: "smooth", block: "end"});
        }, 100);
    };

    const onChangeBehaviorType = (selectedItem: Item) => {
        setSelectedBehaviorType(selectedItem.value);
    };

    // Create behavior type options
    const behaviorTypeOptions: Item[] = Object.keys(BehaviorTypes).map(behaviorType => ({
        key: behaviorType,
        value: behaviorType,
    }));

    const currentBehaviorType = selectedBehaviorType
        ? behaviorTypeOptions.find(opt => opt.value === selectedBehaviorType)
        : undefined;

    return (
        <>
            <AddBehaviorSection>
                <SelectRow
                    width="auto"
                    showListOnTop
                    label=""
                    data={behaviorTypeOptions}
                    value={currentBehaviorType}
                    onChange={onChangeBehaviorType}
                    $margin="0"
                />
                <StyledButton
                    isBlue
                    onClick={onAddNewBehavior}
                    disabled={!selectedBehaviorType}
                    width="43px"
                    height="25px"
                >
                    Add
                </StyledButton>
            </AddBehaviorSection>

            <BehaviorsContainer id="VFXBehaviors">
                {behaviors.map((behavior, index) => (
                    <ParticleBehaviorEditor
                        key={index}
                        behavior={behavior}
                        onDelete={deleteBehavior(index)}
                    />
                ))}
            </BehaviorsContainer>
        </>
    );
};
