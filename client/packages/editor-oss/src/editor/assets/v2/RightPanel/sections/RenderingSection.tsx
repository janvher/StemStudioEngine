import {useState, useEffect} from "react";
import * as THREE from "three";

import global from "@stem/editor-oss/global";
import {PanelCheckbox} from "../common/PanelCheckbox";

interface Props {
    isLocked?: boolean;
}

export const RenderingSection = ({isLocked}: Props) => {
    const app = global.app;
    const editor = app?.editor;
    const sel = editor?.selected;
    const selectedObj = !Array.isArray(sel) && sel instanceof THREE.Object3D ? sel : undefined;

    const initialBatchable =
        selectedObj && typeof selectedObj.userData?.isBatchable === "boolean" ? selectedObj.userData.isBatchable : true;
    const [isBatchable, setIsBatchable] = useState<boolean>(initialBatchable);

    // New: Static flag state
    const initialStatic =
        selectedObj && typeof selectedObj.userData?.isStatic === "boolean" ? selectedObj.userData.isStatic : false;
    const [isStatic, setIsStatic] = useState<boolean>(initialStatic);

    useEffect(() => {
        if (selectedObj) {
            const batchable =
                typeof selectedObj.userData?.isBatchable === "boolean" ? selectedObj.userData.isBatchable : true;
            const stat = typeof selectedObj.userData?.isStatic === "boolean" ? selectedObj.userData.isStatic : false;
            setIsBatchable(batchable);
            setIsStatic(stat);
        }
    }, [selectedObj]);

    const handleBatchableChange = (checked: boolean) => {
        const s = editor?.selected;
        const obj = !Array.isArray(s) && s instanceof THREE.Object3D ? s : undefined;
        if (obj) {
            obj.userData.isBatchable = checked;
            setIsBatchable(checked);
            app?.call("objectChanged", obj, obj);
        }
    };

    const handleStaticChange = (checked: boolean) => {
        const s = editor?.selected;
        const obj = !Array.isArray(s) && s instanceof THREE.Object3D ? s : undefined;
        if (obj) {
            obj.userData.isStatic = checked;
            setIsStatic(checked);
            // Notify listeners so other panels can reflect locking behavior (e.g., isSelectable UI)
            app?.call("objectChanged", obj, obj);
        }
    };

    return (
        <>
            <PanelCheckbox
                text="Enable Object Batching"
                checked={isBatchable}
                onChange={e => handleBatchableChange(!!e.target.checked)}
                isLocked={isLocked}
                v2
                isGray
                regular
            />
            <PanelCheckbox
                text="Static Object"
                checked={isStatic}
                onChange={e => handleStaticChange(!!e.target.checked)}
                isLocked={isLocked}
                v2
                isGray
                height="16px"
                regular
                tooltipText={
                    "Marks this object and all its children as static. Use it to tell the engine your code will not change transforms, materials, or geometry at runtime. This can significantly improve performance and reduce memory usage. Any runtime modifications to static objects may cause undefined behavior."
                }
                tooltipWidth="340px"
            />
        </>
    );
};
