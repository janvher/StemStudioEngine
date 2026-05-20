import { ParticleSystem } from "three.quarks";

import { Item } from "../../../../common/BasicCombobox/BasicCombobox";
import { SelectRow } from "../../../common/SelectRow";

interface Props {
    particleSystem: ParticleSystem;
    updateProperties: () => void
}

export const BooleanFields = ({ updateProperties, particleSystem }: Props) => {
    const onChangeBoolean = (selectedItem: Item, key: keyof ParticleSystem) => {
        // @ts-ignore
        particleSystem[key] = selectedItem.value === "true";
        updateProperties();
    };

    // Options for boolean selects
    const booleanOptions: Item[] = [
        { key: "true", value: "true" },
        { key: "false", value: "false" },
    ];

    const currentBoolean = (key: keyof ParticleSystem) =>
        booleanOptions.find(opt => opt.value === String(particleSystem[key])) || booleanOptions[1];

    const booleanFields: {
        label: string;
        key: keyof ParticleSystem;
    }[] = [
            { label: "Prewarm", key: "prewarm" },
            { label: "Only other System", key: "onlyUsedByOther" },
            { label: "Looping", key: "looping" },
        ];

    return (
        booleanFields.map(field => 
            <SelectRow
                key={field.key}
                label={field.label}
                data={booleanOptions}
                value={currentBoolean(field.key)}
                onChange={item => onChangeBoolean(item, field.key)}
                $margin="0 0 8px 0"
            />,
        )

    );
};
