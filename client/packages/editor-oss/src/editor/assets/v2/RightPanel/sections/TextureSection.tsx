import React, {useEffect, useState} from "react";
import styled from "styled-components";
import * as THREE from "three";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {regularFont} from "../../../../../assets/style";
import {SetColorCommand} from "@stem/editor-oss/command/SetColorCommand";
import global from "@stem/editor-oss/global";
import {ColorRow} from "../common/ColorRow";
import {Separator} from "../common/Separator";

type Props = {
    color: string;
    setColor: React.Dispatch<React.SetStateAction<string | null>>;
    texture: any;
    updateHistory?: boolean;
};
type MeshType = THREE.SkinnedMesh | THREE.Mesh;

export const TextureSection = ({texture, color, updateHistory}: Props) => {
    const app = (global?.app as EngineRuntime) || null;
    const editor = app?.editor;
    const [hasTexture, setHasTexture] = useState(false);

    const handleColorChange = (newColor: string) => {
        const selectedObject = app.editor?.getSelectedObject() as MeshType;
        if (!selectedObject) return;
        const material = selectedObject.material;

        const command = new SetColorCommand(material, "color", new THREE.Color(newColor).getHex());

        if (updateHistory && editor) {
            editor.execute(command);
        }
        app.call(`objectChanged`, selectedObject, selectedObject);
    };

    const updateMaterialSettings = () => {
        const selectedObject = app.editor?.getSelectedObject() as MeshType;
        if (!selectedObject || !(selectedObject instanceof THREE.Mesh) || !selectedObject.material) {
            setHasTexture(false);
            return;
        }
        const material = selectedObject.material;
        if (!(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhongMaterial)) return;

        const materials = Array.isArray(material) ? material : [material];
        const textureProps = [
            "map",
            "normalMap",
            "roughnessMap",
            "metalnessMap",
            "bumpMap",
            "alphaMap",
            "displacementMap",
        ];

        const hasAnyTexture = materials.some(el =>
            textureProps.some(prop => {
                const texture = el[prop];
                return texture && texture.isTexture; // Ensure the texture exists and is a valid texture
            }),
        );
        setHasTexture(hasAnyTexture);

        materials.forEach(el => {
            if (hasAnyTexture) {
                el.color.set(0xffffff); // Ensure texture colors are not tinted
            }

            el.needsUpdate = true;
        });
    };

    useEffect(() => {
        app.on(`objectChanged.TextureSection`, updateMaterialSettings);
        app.on(`objectSelected.TextureSection`, updateMaterialSettings);

        return () => {
            app.on(`objectChanged.TextureSection`, null);
            app.on(`objectSelected.TextureSection`, null);
        };
    }, []);

    useEffect(() => {
        if (texture) {
            updateMaterialSettings();
        }
    }, [texture]);

    return (
        <>
            <ColorRow color={color}
                handleColorChange={handleColorChange}
                disabled={hasTexture}
            />
            {!!hasTexture && 
                <>
                    <Info>To apply color, remove texture.</Info>
                    <Separator margin="16px 0"
                        invisible
                    />
                </>
            }
        </>
    );
};

const Info = styled.div`
    ${regularFont("s")};
    color: var(--theme-font-unselected-color);
    margin-top: -8px;
`;
