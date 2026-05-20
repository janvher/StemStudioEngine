import * as THREE from "three";

import type {RenderingSettings} from "@stem/editor-oss/types/GameSettingsTypes";

export const defaultRendering: RenderingSettings = {
    shadowMapType: THREE.PCFShadowMap,
    ambient: {color: "#ffffff", intensity: 0},
    hemisphere: {skyColor: "#c1e0fe", groundColor: "#e5e695", intensity: 3},
    fog: {type: "none", color: "#aaaaaa"},
    background: {
        type: "Gradient" as const,
        color: "#27272a",
        gradient: "linear-gradient(0deg, #3e4455 0%, #3e4455 65%, #4f576d 85%, #59677f 100%)",
        gradientMode: "2d" as const,
    },
    toneMapping: {type: "None", exposure: 1.0},
};
