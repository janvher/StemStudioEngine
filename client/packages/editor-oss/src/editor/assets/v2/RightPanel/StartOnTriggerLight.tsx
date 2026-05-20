import * as THREE from "three";

import {PanelCheckbox} from "./common/PanelCheckbox";
import {Separator} from "./common/Separator";
import {useLightingContext} from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import {LIGHT_NAME} from "../LeftPanel/MainTabs/AssetsTab/SubTabs/MiscTab";

export const StartOnTriggerLight = () => {
    const app = global.app;
    const editor = app?.editor;
    const {lightState, setLightState} = useLightingContext();

    const handleTrigger = () => {
        const selected = editor?.selected as THREE.Object3D;
        selected.userData.startOnTrigger = !selected.userData.startOnTrigger;
        setLightState(prevState => ({
            ...prevState,
            startOnTrigger: !prevState.startOnTrigger,
        }));
        app?.call(`objectChanged`, selected, selected);
    };

    if (!(lightState.label === LIGHT_NAME.SPOT || lightState.label === LIGHT_NAME.POINT)) return null;

    return (
        <>
            <Separator margin="8px 0 0 0"
                invisible
            />
            <PanelCheckbox
                text="Start on Trigger"
                checked={!!(editor?.selected as any)?.userData.startOnTrigger}
                onChange={handleTrigger}
            />
            <Separator margin="8px 0 8px 0" />
        </>
    );
};
