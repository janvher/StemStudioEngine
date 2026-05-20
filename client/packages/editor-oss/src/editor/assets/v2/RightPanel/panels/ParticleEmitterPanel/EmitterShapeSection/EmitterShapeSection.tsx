import {useEffect, useState, useReducer} from "react";
import {ParticleSystem, EmitterShapes, EmitterShapePlugin} from "three.quarks";

import global from "@stem/editor-oss/global";
import {ParticleSystemPreviewObject} from "../../../../../../../object/particle/ParticleSystemPreviewObject";
import {Item} from "../../../../common/BasicCombobox/BasicCombobox";
import {FieldType, FieldEditor} from "../../../common/FieldEditor/FieldEditor";
import {SelectRow} from "../../../common/SelectRow";
import {Separator} from "../../../common/Separator";

type Props = {
    particleSystem: ParticleSystem;
};

const formatName = (name: string) => {
    return name.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());
};

export const EmitterShapeSection = ({particleSystem}: Props) => {
    const app = global?.app;
    const editor = app?.editor;
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    const getShapeVisibility = () => {
        return particleSystem.emitter.children.some(
            child => child instanceof ParticleSystemPreviewObject && child.visible,
        );
    };

    const [isShapeVisible, setIsShapeVisible] = useState(getShapeVisibility());

    useEffect(() => {
        setIsShapeVisible(getShapeVisibility());
    }, [particleSystem.emitter.uuid]);

    // Get available shape options
    const shapeOptions: Item[] = Object.keys(EmitterShapes).map((shape, index) => ({
        key: index.toString(),
        value: shape,
    }));

    // Get current shape
    const currentShapeType = particleSystem.emitterShape.type;
    const currentShapeOption = shapeOptions.find(option => option.value === currentShapeType) || shapeOptions[0];

    const onChangeShape = (selectedItem: Item) => {
        const shapeType = selectedItem.value;
        if (particleSystem.emitterShape.type !== shapeType) {
            const entry: EmitterShapePlugin | undefined = EmitterShapes[shapeType];
            if (entry) {
                particleSystem.emitterShape = new entry.constructor();
                particleSystem.emitter.traverse(child => {
                    if (child instanceof ParticleSystemPreviewObject) {
                        child.update();
                    }
                });
                onChangeKeyValue();
            }
        }
    };

    const onChangeKeyValue = () => {
        // Trigger update in the application
        particleSystem.emitter.traverse(child => {
            if (child instanceof ParticleSystemPreviewObject) {
                child.update();
            }
        });
        forceUpdate();
        app?.call("objectChanged", editor, particleSystem.emitter);
        app?.call("emitterUpdate");
    };

    const handleVisibilityChange = (visible: boolean) => {
        particleSystem.emitter.children.forEach(child => {
            if (child instanceof ParticleSystemPreviewObject) {
                child.visible = visible;
            }
        });
        setIsShapeVisible(visible);
        onChangeKeyValue();
    };

    const renderShapeProperties = () => {
        const entry = EmitterShapes[particleSystem.emitterShape.type];
        if (!entry || !entry.params) {
            return null;
        }

        return entry.params
            .map(([varName, paramType]) => {
                // Get current value from the emitter shape
                const emitterShape = particleSystem.emitterShape as unknown as Record<string, unknown>;
                const currentValue = emitterShape[varName];

                // Handle value update
                const handleValueChange = (value: unknown) => {
                    emitterShape[varName] = value;
                    onChangeKeyValue();
                };

                // Use FieldEditor for all supported field types
                return (
                    <FieldEditor
                        key={varName}
                        label={formatName(varName)}
                        fieldType={paramType as FieldType}
                        value={currentValue}
                        onChange={handleValueChange}
                        margin="0 0 8px 0"
                        target={emitterShape}
                        fieldName={varName}
                    />
                );
            })
            .filter(Boolean);
    };

    return (
        <>
            {/* <PanelCheckbox
                text="Toggle Shape Visibility"
                checked={isShapeVisible}
                onChange={e => handleVisibilityChange(!!e.target.checked)}
                v2
                isGray
                regular
            /> */}
            <Separator margin="0 0 8px"
                invisible
            />
            <SelectRow
                label="Shape"
                data={shapeOptions}
                value={currentShapeOption}
                onChange={onChangeShape}
                $margin="0 0 8px"
            />
            {renderShapeProperties()}
        </>
    );
};
