import {useState, useEffect} from "react";
import * as THREE from "three";

import global from "@stem/editor-oss/global";
import CameraUtils from "@stem/editor-oss/utils/CameraUtils";
import {PanelCheckbox} from "../common/PanelCheckbox";

interface Props {
    isLocked?: boolean;
    hideVisibility?: boolean;
}

interface InGameSettingsState {
    isSelectable: boolean;
    enableAtStart: boolean;
    blocksCamera: boolean;
}

const getState = (selected: THREE.Object3D): InGameSettingsState => ({
    isSelectable: typeof selected?.userData?.isSelectable === "boolean" ? selected.userData.isSelectable : true,
    enableAtStart: typeof selected?.userData?.enableAtStart === "boolean" ? selected.userData.enableAtStart : true,
    blocksCamera: typeof selected?.userData?.disableCameraCollision === "boolean" ? !selected.userData.disableCameraCollision : true,
});

export const InGameSettingsSection = ({isLocked}: Props) => {
    const app = global.app;
    const editor = app?.editor;
    const selected = editor?.selected as THREE.Object3D | THREE.Object3D[] | undefined;
    const selectedObj = !Array.isArray(selected) && selected instanceof THREE.Object3D ? selected : undefined;
    const [tick, setTick] = useState(0);
    // Effective static is true if this object or any ancestor is static
    const computeEffectiveStatic = (obj?: THREE.Object3D): boolean => {
        if (!obj) return false;
        const selfStatic = !!obj.userData?.isStatic;
        if (selfStatic) return true;
        let parent = obj.parent as THREE.Object3D | null | undefined;
        while (parent) {
            if (parent.userData?.isStatic) return true;
            parent = parent.parent;
        }
        return false;
    };
    const effectiveStatic = computeEffectiveStatic(selectedObj);

    const [state, setState] = useState<InGameSettingsState>(
        selectedObj ? getState(selectedObj) : {isSelectable: true, enableAtStart: true, blocksCamera: true},
    );

    useEffect(() => {
        if (selectedObj) {
            setState(getState(selectedObj));
        }
    }, [selectedObj]);

    // Re-evaluate immediately on object changes/select changes so locking/unlocking is instant
    useEffect(() => {
        const onObjEvent = () => {
            const s = editor?.selected as THREE.Object3D | THREE.Object3D[] | undefined;
            const obj = !Array.isArray(s) && s instanceof THREE.Object3D ? s : undefined;
            if (obj) {
                setState(getState(obj));
            }
        };
        app?.on("objectChanged.InGameSettings", onObjEvent);
        app?.on("objectSelected.InGameSettings", onObjEvent);
        return () => {
            app?.on("objectChanged.InGameSettings", null);
            app?.on("objectSelected.InGameSettings", null);
        };
    }, [app, editor]);

    // Force re-render when object metadata changes (e.g., isStatic toggled in RenderingSection)
    useEffect(() => {
        const rerender = () => setTick(t => t + 1);
        app?.on?.("objectChanged.InGameSettings", rerender);
        app?.on?.("objectSelected.InGameSettings", rerender);
        return () => {
            app?.on?.("objectChanged.InGameSettings", null);
            app?.on?.("objectSelected.InGameSettings", null);
        };
    }, [app]);

    const handleIsSelectableChange = (checked: boolean) => {
        if (selected && !Array.isArray(selected)) {
            selected.userData.isSelectable = checked;
            setState(prev => ({...prev, isSelectable: checked}));
            app?.call("objectChanged", selected, selected);
        }
    };

    const handleAiVisibilityChange = (checked: boolean) => {
        if (selected && !Array.isArray(selected)) {
            selected.userData.visibleByAI = checked;
            setState(prev => ({...prev, visibleByAI: checked}));
            app?.call("objectChanged", selected, selected);
        }
    };

    const handleBlocksCameraChange = (checked: boolean) => {
        if (selected && !Array.isArray(selected)) {
            if (checked) {
                CameraUtils.enableCameraCollision(selected);
            } else {
                CameraUtils.disableCameraCollision(selected);
            }
            setState(prev => ({...prev, blocksCamera: checked}));
            app?.call("objectChanged", selected, selected);
        }
    }

    const handleEnableAtStartChange = (checked: boolean) => {
        if (selected && !Array.isArray(selected)) {
            selected.userData.enableAtStart = checked;
            setState(prev => ({...prev, enableAtStart: checked}));
            app?.call("objectChanged", selected, selected);
        }
    };

    return (
        <>
            {/* force re-render on object change */}
            <span style={{display: "none"}}>{tick}</span>
            <PanelCheckbox
                text="Enable at Start"
                checked={state.enableAtStart}
                onChange={e => handleEnableAtStartChange(!!e.target.checked)}
                isLocked={isLocked}
                v2
                isGray
                regular
            />
            <PanelCheckbox
                text="Make Object Selectable"
                checked={effectiveStatic ? false : state.isSelectable}
                onChange={e => handleIsSelectableChange(!!e.target.checked)}
                isLocked={isLocked || effectiveStatic}
                disabled={effectiveStatic}
                lockedReason={
                    effectiveStatic
                        ? "This object is static (or inherits static from a parent). Selectable is locked."
                        : undefined
                }
                v2
                isGray
                regular
            />
            <PanelCheckbox
                text="Blocks Camera"
                checked={state.blocksCamera}
                onChange={e => handleBlocksCameraChange(!!e.target.checked)}
                isLocked={isLocked}
                v2
                isGray
                regular
            />
            <PanelCheckbox
                text="Visible to AI NPC"
                checked={
                    typeof selectedObj?.userData?.visibleByAI === "boolean" ? selectedObj.userData.visibleByAI : true
                }
                onChange={e => handleAiVisibilityChange(!!e.target.checked)}
                isLocked={isLocked}
                v2
                isGray
                regular
            />
        </>
    );
};
