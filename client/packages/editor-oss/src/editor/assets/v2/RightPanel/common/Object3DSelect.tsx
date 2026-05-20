import React, {useEffect, useState} from "react";
import {Object3D} from "three";

import {SelectRow} from "./SelectRow";
import global from "@stem/editor-oss/global";

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
        if (traversableTypes.indexOf(child.type) !== -1)
            listObjects(child, list, traversableTypes, listableTypes);
    }
};

interface MeshSelectProps {
    name: string;
    listableTypes: string[];
    onChange: (value: Object3D) => void;
    value?: Object3D;
}

export const Object3DSelect: React.FC<MeshSelectProps> = props => {
    const [listObjs, setListObjects] = useState<Object3D[]>([]);

    useEffect(() => {
        const scene = global.app?.editor?.scene;
        const objs: Object3D[] = [];
        if (scene) {
            listObjects(scene, objs, SelectableSearchable, props.listableTypes);
        }
        setListObjects(objs);
    }, []);
    //listObjects(context.scene, listObjs, SelectableSearchable, props.listableTypes);
    const selectedObj = props.value ? listObjs.find(obj => obj.uuid === props.value?.uuid) : undefined;
    return (
        <SelectRow
            label={props.name}
            value={selectedObj ? {key: selectedObj.name, value: selectedObj.uuid} : undefined}
            data={listObjs.map(obj => ({key: obj.uuid, value: obj.name}))}
            onChange={item => {
                const obj = listObjs.find(o => o.uuid === item.key);
                if (obj) {
                    props.onChange(obj);
                }
            }}
        />
    );
};
