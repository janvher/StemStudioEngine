import React, {useReducer} from "react";
import {ParticleSystem, TrailSettings, RenderMode,FunctionValueGenerator, ValueGenerator,ColorGenerator, FunctionColorGenerator} from "three.quarks";

import global from "@stem/editor-oss/global";
import {Item} from "../../../../common/BasicCombobox/BasicCombobox";
import {FieldType} from "../../../common/FieldEditor/FieldEditor";
import {GeneratorEditor, GenericGenerator} from "../../../common/GeneratorEditor/GeneratorEditor";
import {SelectRow} from "../../../common/SelectRow";

interface ParticleSystemSectionProps {
    particleSystem: ParticleSystem;
}

export const ParticleSystemSection: React.FC<ParticleSystemSectionProps> = ({particleSystem}) => {
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

    const onChangeStartSpeed = (g: GenericGenerator) => {
        particleSystem.startSpeed = g as ValueGenerator | FunctionValueGenerator;
        updateProperties();
    };

    const onChangeStartLife = (g: GenericGenerator) => {
        particleSystem.startLife = g as ValueGenerator | FunctionValueGenerator;
        updateProperties();
    };

    const onChangeStartSize = (g: GenericGenerator) => {
        // Handle different types of generators for startSize
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        particleSystem.startSize = g as any;
        updateProperties();
    };

    const onChangeStartColor = (g: GenericGenerator) => {
        particleSystem.startColor = g as ColorGenerator | FunctionColorGenerator;
        updateProperties();
    };

    const onChangeStartRotation = (g: GenericGenerator) => {
        particleSystem.startRotation = g as ValueGenerator | FunctionValueGenerator;
        updateProperties();
    };

    const onChangeStartLength = (g: GenericGenerator) => {
        (particleSystem.rendererEmitterSettings as TrailSettings).startLength = g as
            | ValueGenerator
            | FunctionValueGenerator;
        updateProperties();
    };

    const onChangeFollowLocalOrigin = (selectedItem: Item) => {
        const value = selectedItem.value === "true";
        (particleSystem.rendererEmitterSettings as TrailSettings).followLocalOrigin = value;
        updateProperties();
    };

    // Generator type configurations
    const valueFunctionTypes: FieldType[] = ["value", "valueFunc"];
    const rotationFunctionTypes: FieldType[] = ["rotationFunc"];
    const colorValueFunctionTypes: FieldType[] = ["color", "colorFunc"];

    // Options for follow local origin
    const booleanOptions: Item[] = [
        {key: "True", value: "true"},
        {key: "False", value: "false"},
    ];

    // Get current value for follow local origin
    const currentFollowLocalOrigin = () => {
        if (particleSystem.renderMode === RenderMode.Trail) {
            const followLocalOrigin = (particleSystem.rendererEmitterSettings as TrailSettings).followLocalOrigin;
            return (
                booleanOptions.find(opt => opt.value === (followLocalOrigin ? "true" : "false")) || booleanOptions[1]
            );
        }
        return booleanOptions[1];
    };

    return (
        <>
            <GeneratorEditor
                name="Start Life"
                selectLabel="Start Life Type"
                allowedType={valueFunctionTypes}
                value={particleSystem.startLife}
                onChange={onChangeStartLife}
                margin="0 0 8px 0"
            />

            <GeneratorEditor
                name="Start Size"
                selectLabel="Start Size Type"
                allowedType={valueFunctionTypes}
                value={particleSystem.startSize as GenericGenerator}
                onChange={onChangeStartSize}
                margin="0 0 8px 0"
            />

            <GeneratorEditor
                name="Start Speed"
                selectLabel="Start Speed Type"
                allowedType={valueFunctionTypes}
                value={particleSystem.startSpeed}
                onChange={onChangeStartSpeed}
                margin="0 0 8px 0"
            />

            <GeneratorEditor
                name="Start Color"
                selectLabel="Start Color Type"
                allowedType={colorValueFunctionTypes}
                value={particleSystem.startColor}
                onChange={onChangeStartColor}
                margin="0 0 8px 0"
            />

            {particleSystem.renderMode === RenderMode.Mesh ? 
                <GeneratorEditor
                    name="Start Rotation"
                    selectLabel="Start Rotation Type"
                    allowedType={rotationFunctionTypes}
                    value={particleSystem.startRotation}
                    onChange={onChangeStartRotation}
                    margin="0 0 8px 0"
                />
             : 
                <GeneratorEditor
                    name="Start Rotation"
                    selectLabel="Start Rotation Type"
                    allowedType={valueFunctionTypes}
                    value={particleSystem.startRotation}
                    onChange={onChangeStartRotation}
                    margin="0 0 8px 0"
                />
            }

            {particleSystem.renderMode === RenderMode.Trail && 
                <>
                    <GeneratorEditor
                        name="Start Length"
                        selectLabel="Start Length Type"
                        allowedType={valueFunctionTypes}
                        value={(particleSystem.rendererEmitterSettings as TrailSettings).startLength}
                        onChange={onChangeStartLength}
                        margin="0 0 8px 0"
                    />

                    <SelectRow
                        label="Follow Local Origin"
                        data={booleanOptions}
                        value={currentFollowLocalOrigin()}
                        onChange={onChangeFollowLocalOrigin}
                        $margin="0 0 8px 0"
                    />
                </>
            }
        </>
    );
};
