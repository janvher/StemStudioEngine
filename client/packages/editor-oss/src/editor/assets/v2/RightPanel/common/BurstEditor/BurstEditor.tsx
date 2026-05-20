import React from "react";
import {BurstParameters} from "three.quarks";

import {CollapsibleEditorSection} from "../CollapsibleEditorSection/CollapsibleEditorSection";
import {GeneratorEditor} from "../GeneratorEditor/GeneratorEditor";
import {NumericInputRow} from "../NumericInputRow";

interface BurstEditorProps {
    params: BurstParameters;
    index: number;
    onDelete: () => void;
    onUpdate: () => void;
}

export const BurstEditor: React.FC<BurstEditorProps> = ({params, index, onDelete, onUpdate}) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleValueChange = (key: string) => (value: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (params as any)[key] = value;
        onUpdate();
    };

    const actions = [
        {
            label: "Delete",
            onClick: onDelete,
            variant: "delete" as const,
        },
    ];

    return (
        <CollapsibleEditorSection title={`Burst ${index + 1}`}
            defaultExpanded
            actions={actions}
        >
            <NumericInputRow label="Time"
                value={params.time}
                setValue={handleValueChange("time")}
                $margin="0"
            />
            <GeneratorEditor
                allowedType={["value", "valueFunc"]}
                name="Count"
                value={params.count}
                onChange={handleValueChange("count")}
            />
            <NumericInputRow label="Cycle"
                value={params.cycle}
                setValue={handleValueChange("cycle")}
                $margin="0"
            />
            <NumericInputRow
                label="Interval"
                value={params.interval}
                setValue={handleValueChange("interval")}
                $margin="0"
            />
            <NumericInputRow
                label="Probability"
                value={params.probability}
                setValue={handleValueChange("probability")}
                $margin="0"
                min={0}
                max={1}
            />
        </CollapsibleEditorSection>
    );
};
