// Note: We intentionally avoid importing quarks types here to prevent coupling
import React, {useEffect, useState} from "react";
import {BufferGeometry, Mesh, Object3D} from "three";

import {SelectRow} from "./SelectRow";
import global from "@stem/editor-oss/global";
import {DYNAMIC_ROOT_NAME} from "@stem/editor-oss/scene/dynamicRoots";
import {Item} from "../../common/BasicCombobox/BasicCombobox";

export const SelectableSearchable = [
    "Group",
    "Mesh",
    "PointLight",
    "AmbientLight",
    "DirectionalLight",
    "ParticleSystemPreview",
    "ParticleEmitter",
];

export const listObjects = (obj: Object3D, list: Object3D[], traversableTypes: string[], listableTypes: string[]) => {
    const children = obj.children;
    for (let i = 0, l = children.length; i < l; i++) {
        const child = children[i];
        if (!child) continue;
        if (listableTypes.indexOf(child.type) !== -1) list.push(child);
        if (traversableTypes.indexOf(child.type) !== -1) listObjects(child, list, traversableTypes, listableTypes);
    }
};

interface GeometryOption extends Item {
    geometry: BufferGeometry;
}

interface GeometrySelectProps {
    name: string;
    onChange: (value: BufferGeometry) => void;
    value?: BufferGeometry;
    $margin?: string;
}

export const GeometrySelect: React.FC<GeometrySelectProps> = props => {
    const [geometryOptions, setGeometryOptions] = useState<GeometryOption[]>([]);

    useEffect(() => {
        const scene: Object3D | undefined = ((): Object3D | undefined => {
            const s = (global as unknown as { app?: { editor?: { scene?: unknown } } }).app?.editor?.scene;
            return s && s instanceof Object3D ? s : undefined;
        })();
        const objs: Object3D[] = [];
        if (scene) listObjects(scene, objs, SelectableSearchable, ["Mesh", "ParticleEmitter"]);

        const getObjectPath = (obj: Object3D | null | undefined, root?: Object3D): string => {
            if (!obj) return "";
            const segments: string[] = [];
            let current: Object3D | null = obj;
            while (current && current !== root) {
                const seg = current.name && current.name.trim().length > 0 ? current.name.trim() : current.type;
                segments.push(seg);
                current = current.parent;
            }
            return segments.reverse().join("/");
        };
        const sceneRoot: Object3D | undefined = scene instanceof Object3D ? scene : undefined;

        const isChildOfDynamic = (obj: Object3D): boolean => {
            let current: Object3D | null = obj.parent;
            while (current) {
                if (current.name === DYNAMIC_ROOT_NAME) {
                    return true;
                }
                current = current.parent;
            }
            return false;
        };

        // Create geometry options from found objects
        const options: GeometryOption[] = [];

        objs.forEach(obj => {
            if (isChildOfDynamic(obj)) {
                return;
            }

            if (obj.type === "Mesh") {
                const mesh = obj as Mesh;
                const fullPath = getObjectPath(mesh, sceneRoot);
                const name = mesh.name && mesh.name.trim().length > 0 ? mesh.name.trim() : mesh.type;
                options.push({
                    // Show path + uuid for clearer identification
                    key: `${mesh.geometry.uuid}`,
                    // Use composite value: name + path + uuid
                    value: `${name}|${fullPath}|${mesh.geometry.uuid}`,
                    geometry: mesh.geometry,
                });
            } else if (obj.type === "ParticleEmitter") {
                // Access instancingGeometry via a narrow typed view to avoid unsafe member access
                type HasInstancingGeometry = { system?: { instancingGeometry?: BufferGeometry } };
                const sysLike = obj as unknown as HasInstancingGeometry;
                const instancingGeometry = sysLike.system?.instancingGeometry;
                if (instancingGeometry) {
                    const fullPath = getObjectPath(obj, sceneRoot);
                    const name = obj.name && obj.name.trim().length > 0 ? obj.name.trim() : obj.type;
                    options.push({
                        key: `${instancingGeometry.uuid}`,
                        value: `${name}|${fullPath}|${instancingGeometry.uuid}`,
                        geometry: instancingGeometry,
                    });
                }
            }
        });

        setGeometryOptions(options);
    }, []);

    // Find the currently selected geometry
    const selectedGeometry = props.value ? geometryOptions.find(option => option.key === props.value?.uuid) : undefined;

    const handleChange = (item: Item) => {
        // Match by composite value string
        const option = geometryOptions.find(opt => opt.value === item.value);
        if (option && option.geometry) {
            props.onChange(option.geometry);
        }
    };

    return (
        <SelectRow
            label={props.name}
            value={selectedGeometry ? {key: selectedGeometry.key, value: selectedGeometry.value} : undefined}
            data={geometryOptions}
            onChange={handleChange}
            $margin={props.$margin}
            width={"150px"}
        />
    );
};
