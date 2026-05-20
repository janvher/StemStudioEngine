import { useEffect, useState } from "react";

import "../css/SwitchSection.css";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import ShadowUtils from "@stem/editor-oss/utils/ShadowUtils";
import { PanelCheckbox } from "../common/PanelCheckbox";

interface Props {
    isLocked?: boolean;
}

export const ModelLightingSection = ({ isLocked }: Props) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor;

    const [castShadowEnabled, setCastShadowEnabled] = useState(false);
    const [receiveShadowEnabled, setReceiveShadowEnabled] = useState(false);
    const [receiveFogEnabled, setReceiveFogEnabled] = useState(true);

    const handleCastShadowToggle = (castShadowEnabled: boolean) => {
        const selected = editor?.selected;
        if (selected && !(selected instanceof Array)) {
            ShadowUtils.applyCastShadow(selected, castShadowEnabled, true);
            setCastShadowEnabled(ShadowUtils.isCastShadowEnabled(selected));
            app.call(`objectChanged`, selected, selected);
        }
    };

    const handleReceiveShadowToggle = (receiveShadowEnabled: boolean) => {
        const selected = editor?.selected;
        if (selected && !(selected instanceof Array)) {
            ShadowUtils.applyReceiveShadow(selected, receiveShadowEnabled, true);
            setReceiveShadowEnabled(ShadowUtils.isReceiveShadowEnabled(selected));
            app.call(`objectChanged`, selected, selected);
        }
    };

    const handleReceiveFogToggle = (receiveFogEnabled: boolean) => {
        const selected = editor?.selected;
        if (selected && !(selected instanceof Array)) {
            ShadowUtils.applyReceiveFog(selected, receiveFogEnabled, true);
            setReceiveFogEnabled(ShadowUtils.isReceiveFogEnabled(selected));
            app.call(`objectChanged`, selected, selected);
        }
    };

    useEffect(() => {
        if (!editor || !editor.selected) return;

        const updatePanelState = () => {
            const selected = editor.selected;
            if (selected && !(selected instanceof Array)) {
                setCastShadowEnabled(ShadowUtils.isCastShadowEnabled(selected));
                setReceiveShadowEnabled(ShadowUtils.isReceiveShadowEnabled(selected));
                setReceiveFogEnabled(ShadowUtils.isReceiveFogEnabled(selected));
            }
        };

        updatePanelState();
        app.on("objectSelected.ModelLigthningSection", updatePanelState);
        return () => {
            app.on("objectSelected.ModelLigthningSection", null);
        };
    }, [app, editor]);

    return (
        <div className="SwitchSection">
            <PanelCheckbox
                v2
                isGray
                regular
                text="Cast Shadows"
                checked={!!castShadowEnabled}
                onChange={e => handleCastShadowToggle(!!e.target.checked)}
                isLocked={isLocked}
            />
            <PanelCheckbox
                v2
                isGray
                regular
                text="Receive Shadows"
                checked={!!receiveShadowEnabled}
                onChange={e => handleReceiveShadowToggle(!!e.target.checked)}
                isLocked={isLocked}
            />
            <PanelCheckbox
                v2
                isGray
                regular
                text="Receive Fog"
                checked={!!receiveFogEnabled}
                onChange={e => handleReceiveFogToggle(!!e.target.checked)}
                isLocked={isLocked}
            />
        </div>
    );
};
