import {useCallback, useEffect, useState} from "react";
import * as THREE from "three";
import {Object3D} from "three";

import global from "@stem/editor-oss/global";
import Editor from "../../../../Editor";
import {PanelCheckbox} from "../common/PanelCheckbox";

interface Props {
    isLocked?: boolean;
}

interface VisibilityState {
    visible: boolean;
    backfaceVisible: boolean;
}

const getVisibilityState = (selectedObject: Object3D | Object3D[] | null): VisibilityState => {
    if (!selectedObject || Array.isArray(selectedObject)) {
        return {visible: false, backfaceVisible: false};
    }
    return {
        visible:
            selectedObject?.userData.gameVisibility !== undefined
                ? selectedObject.userData.gameVisibility
                : selectedObject.visible,
        backfaceVisible:
            selectedObject instanceof THREE.Mesh &&
            selectedObject?.material instanceof THREE.Material &&
            // eslint-disable-next-line eqeqeq
            selectedObject.material?.side != undefined
                ? selectedObject?.material?.side === THREE.DoubleSide
                : false,
    };
};

export const VisibilitySection = ({isLocked}: Props) => {
    const app = global.app;
    const editor = app?.editor as Editor;
    const [isHidden, setHidden] = useState(false);
    const [material, setMaterial] = useState<THREE.Material | null>(null);
    const [objectVisibilityState, setObjectVisibilityState] = useState<VisibilityState>(
        getVisibilityState(editor.selected),
    );

    const publishStateUpdate = useCallback((newState: Partial<VisibilityState>) => {
        setObjectVisibilityState(prev => ({...prev, ...newState}));
        app?.call("objectChanged", editor?.selected, editor?.selected);
    }, []);

    const resetObjectState = useCallback((selectedObject: Object3D | Object3D[] | null) => {
        setHidden(!(selectedObject instanceof THREE.Object3D));

        setObjectVisibilityState(getVisibilityState(selectedObject));

        if (selectedObject instanceof THREE.Mesh && selectedObject.material?.side !== undefined) {
            setMaterial(selectedObject.material);
        }

        //if the value is not present in the scene lets bootstrap it with visible
        if (selectedObject instanceof THREE.Object3D && selectedObject.userData.gameVisibility === undefined) {
            selectedObject.userData.gameVisibility = true;
            //Ask the scene to be updated
            publishStateUpdate({visible: selectedObject.visible});
        }
    }, []);

    useEffect(() => {
        resetObjectState(editor?.selected);

        app?.on("objectSelected.VisibilitySection", () => {
            resetObjectState(editor?.selected);
        });
        return () => {
            app?.on("objectSelected.VisibilitySection", null);
        };
    }, [app]);

    const handleGameVisibilityChanged = (checked: boolean) => {
        if (editor?.selected instanceof THREE.Object3D) {
            editor.selected.userData.gameVisibility = checked;
            publishStateUpdate({visible: checked});
        }
    };

    return (
        <>
            {!isHidden && 
                <>
                    <PanelCheckbox
                        text="Visible (Play Mode)"
                        checked={objectVisibilityState.visible}
                        onChange={e => handleGameVisibilityChanged(!!e.target.checked)}
                        isLocked={isLocked}
                        v2
                        isGray
                        regular
                    />
                </>
            }
            {material?.side !== undefined && 
                <PanelCheckbox
                    text="Backface Visibility"
                    checked={objectVisibilityState.backfaceVisible}
                    onChange={e => {
                        const checked = e.target.checked;
                        material.side = checked ? THREE.DoubleSide : THREE.FrontSide;
                        publishStateUpdate({backfaceVisible: checked});
                    }}
                    isLocked={isLocked}
                    v2
                    isGray
                    regular
                />
            }
        </>
    );
};
