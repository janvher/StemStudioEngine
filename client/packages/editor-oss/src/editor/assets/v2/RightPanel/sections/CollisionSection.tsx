import { useEffect, useState } from "react";
import * as THREE from "three";

import global from "@stem/editor-oss/global";
import { COLLISION_MATERIAL_TYPE } from "@stem/editor-oss/types/editor";
import { Item } from "../../common/BasicCombobox/BasicCombobox";
import { PhysicsConfig } from "../../types/physics";
import { getPhysics } from "../../utils/getPhysics";
import { SelectRow } from "../common/SelectRow";

export const CollisionSection = () => {
    const app = global.app;
    const editor = app?.editor;
    const selected = editor?.selected;
    const userData = selected instanceof THREE.Object3D ? selected?.userData : null;
    const [physics, setPhysics] = useState(getPhysics(userData?.physics));
    const [materialOptions, setMaterialOptions] = useState<Item[]>([]);
    // const [selectedMaterial, setSelectedMaterial] = useState<string>(physics.collision_material);
    const handlePhysicsChange = (value: string, name: keyof PhysicsConfig) => {
        if (userData?.physics) {
            userData.physics = {
                ...userData.physics,
                [name]: value,
            };
            setPhysics(userData.physics as PhysicsConfig);
        }

        app?.call(`objectChanged`, selected, selected);
    };

    const createItemsFromMaterials = () => {
        setMaterialOptions(
            Object.values(COLLISION_MATERIAL_TYPE).map((material, index) => ({
                key: index.toString(),
                value: material,
            })),
        );
    };

    const updatePhysics = () => {
        setPhysics(getPhysics(userData?.physics));
    };

    useEffect(() => {
        app?.on("objectChanged.CollisionSection", updatePhysics);
        app?.on("objectSelected.CollisionSection", updatePhysics);

        return () => {
            app?.on("objectChanged.CollisionSection", null);
            app?.on("objectSelected.CollisionSection", null);
        };
    }, []);

    useEffect(() => {
        createItemsFromMaterials();
    }, []);

    return (
        <SelectRow
            label="React like Material"
            data={materialOptions}
            value={materialOptions.find(el => el.value === physics.collision_material as string)}
            onChange={item => handlePhysicsChange(item.value, "collision_material")}
        />
    );
};
