import React, {useReducer} from "react";
import styled from "styled-components";
import {ParticleSystem, ValueGenerator, FunctionValueGenerator, ConstantValue} from "three.quarks";

import {BooleanFields} from "./BooleanFields";
import {StyledButton} from "../../../../../../../editor/assets/v2/common/StyledButton";
import global from "@stem/editor-oss/global";
import {BurstEditor} from "../../../common/BurstEditor/BurstEditor";
import {FieldType} from "../../../common/FieldEditor/FieldEditor";
import {GeneratorEditor, GenericGenerator} from "../../../common/GeneratorEditor/GeneratorEditor";
import {NumericInputRow} from "../../../common/NumericInputRow";
import {StyledRowWrapper} from "../../../common/StyledRowWrapper";

const BurstControls = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    width: 100%;
`;

interface EmissionSectionProps {
    particleSystem: ParticleSystem;
}

export const EmissionSection: React.FC<EmissionSectionProps> = ({particleSystem}) => {
    const app = global?.app;
    const editor = app?.editor;
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    const updateProperties = () => {
        // Trigger update in the application
        if (app && editor?.selected) {
            app.call("objectChanged", editor, editor.selected);
            app.call("emitterUpdate");
        }
        forceUpdate();
    };

    const addBurst = () => {
        particleSystem.emissionBursts.push({
            time: 0,
            count: new ConstantValue(10),
            cycle: 0,
            interval: 0,
            probability: 1,
        });
        updateProperties();
    };

    const deleteBurst = (index: number) => () => {
        particleSystem.emissionBursts.splice(index, 1);
        updateProperties();
    };

    const editTime = () => {
        particleSystem.emissionBursts.sort((a, b) => a.time - b.time);
        updateProperties();
    };

    const onChangeDuration = (value: number) => {
        particleSystem.duration = value;
        updateProperties();
    };

    const onChangeEmissionOverTime = (generator: GenericGenerator) => {
        particleSystem.emissionOverTime = generator as ValueGenerator | FunctionValueGenerator;
        updateProperties();
    };

    const onChangeEmissionOverDistance = (generator: GenericGenerator) => {
        particleSystem.emissionOverDistance = generator as ValueGenerator | FunctionValueGenerator;
        updateProperties();
    };

    const valueFunctionTypes: FieldType[] = ["value", "valueFunc"];

    return (
        <>
            <BooleanFields updateProperties={updateProperties}
                particleSystem={particleSystem}
            />
            <NumericInputRow
                label="Duration"
                value={particleSystem.duration}
                setValue={onChangeDuration}
                $margin="0 0 8px 0"
            />

            <GeneratorEditor
                allowedType={valueFunctionTypes}
                name="Emit Over Time"
                selectLabel="Emit Type"
                value={particleSystem.emissionOverTime}
                onChange={onChangeEmissionOverTime}
                margin="0 0 8px 0"
            />

            <GeneratorEditor
                allowedType={valueFunctionTypes}
                name="Emit Over Distance"
                selectLabel="Emit Distance Type"
                value={particleSystem.emissionOverDistance}
                onChange={onChangeEmissionOverDistance}
                margin="0 0 8px 0"
            />

            <StyledRowWrapper $margin="0 0 8px 0">
                <BurstControls>
                    <span className="text">Bursts</span>
                    <StyledButton isBlue
                        onClick={addBurst}
                        width="80px"
                    >
                        Add Burst
                    </StyledButton>
                </BurstControls>
            </StyledRowWrapper>

            {particleSystem.emissionBursts.map((burst, index) => 
                <BurstEditor
                    key={index}
                    params={burst}
                    index={index}
                    onDelete={deleteBurst(index)}
                    onUpdate={editTime}
                />,
            )}
        </>
    );
};
