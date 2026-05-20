import { useEffect, useState } from "react";
import * as THREE from "three";

import { SelectedMenuProps } from "./SelectedMenu";
import { ObjectContainer, ObjectName, ObjectNameWrapper, Preview, RenameInput } from "./style";
import global from "@stem/editor-oss/global";
import editIcon from "../../../../ContextMenu/icons/v2/edit.svg";
import { PRIMITIVES_GEOMETRY } from "../../../../LeftPanel/MainTabs/AssetsTab/SubTabs/primitivesHelpers";
import { PRIMITIVES_LIST, PRIMITIVES_NAME } from "../../../../LeftPanel/MainTabs/AssetsTab/SubTabs/PrimitivesTab";

export const ObjectPreview = ({ selectedObj }: SelectedMenuProps) => {
    const app = global.app;
    const editor = app?.editor;

    const [showRenameInput, setShowRenameInput] = useState(false);
    const [objName, setObjName] = useState(selectedObj?.name || "");

    useEffect(() => {
        if (selectedObj) {
            setObjName(selectedObj.name);
        }
    }, [selectedObj]);

    const handleNameChange = (e: React.SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (app && editor?.selected) {
            const selected = editor?.selected as THREE.Object3D<THREE.Object3DEventMap>;
            const value = objName;
            selected.name = value;
            selected.userData.uiTag = `UITag_${value}`;
            selected.userData.variable = value;

            app.call(`objectChanged`, editor.selected, editor.selected);
        }
        setShowRenameInput(false);
    };

    const getPrimitiveIcon = () => {
        const geometryType = (selectedObj as any)?.geometry?.type;

        // Legacy plane primitives are actually a Group or Object3D with a Mesh
        // child object. These legacy planes are identified by userData.isPlane.
        if (selectedObj?.userData?.isPlane) {
            return PRIMITIVES_LIST.find(el => el.name === PRIMITIVES_NAME.PLANE)?.icon;
        }

        switch (geometryType) {
            case PRIMITIVES_GEOMETRY.BOX:
                return PRIMITIVES_LIST.find(el => el.name === PRIMITIVES_NAME.BOX)?.icon;
            case PRIMITIVES_GEOMETRY.CONE:
                return PRIMITIVES_LIST.find(el => el.name === PRIMITIVES_NAME.CONE)?.icon;
            case PRIMITIVES_GEOMETRY.TRIANGLE:
                return PRIMITIVES_LIST.find(el => el.name === PRIMITIVES_NAME.TRIANGLE)?.icon;
            case PRIMITIVES_GEOMETRY.SPHERE:
                return PRIMITIVES_LIST.find(el => el.name === PRIMITIVES_NAME.SPHERE)?.icon;
            case PRIMITIVES_GEOMETRY.PLANE:
                return PRIMITIVES_LIST.find(el => el.name === PRIMITIVES_NAME.PLANE)?.icon;
            case PRIMITIVES_GEOMETRY.CYLINDER:
                return PRIMITIVES_LIST.find(el => el.name === PRIMITIVES_NAME.CYLINDER)?.icon;

            default:
                break;
        }
    };

    const modelThumbnail = selectedObj.userData.Thumbnail;

    return (
        <ObjectContainer>
            <Preview>
                <img
                    className={modelThumbnail ? "thumbnail" : "thumbnail primitive"}
                    src={modelThumbnail || getPrimitiveIcon()}
                />
            </Preview>
            {showRenameInput ? 
                <form onSubmit={handleNameChange}>
                    <RenameInput
                        type="text"
                        onChange={e => setObjName(e.target.value)}
                        value={objName}
                        onBlur={e => {
                            setTimeout(() => {
                                handleNameChange(e);
                            }, 0);
                        }}
                    />
                </form>
             : 
                <ObjectNameWrapper>
                    <ObjectName> {objName}</ObjectName>
                    <button className="reset-css"
                        onClick={() => setShowRenameInput(true)}
                    >
                        <img src={editIcon}
                            alt=""
                        />
                    </button>
                </ObjectNameWrapper>
            }
        </ObjectContainer>
    );
};
