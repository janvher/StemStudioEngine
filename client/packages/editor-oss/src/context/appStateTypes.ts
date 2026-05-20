import {PAGES} from "../editor/assets/v2/CreateDashboard/constants";
import {ROUTES} from "@web-shared/routes";

export const ADMIN_LABEL = "Admin Panel";

export type ActivePage = PAGES | typeof ADMIN_LABEL | ROUTES | undefined;

export enum RIGHT_PANEL_VERSIONS {
    None,
    GameSettings,
    CameraSettings,
    Billboard,
    ImageBillboard,
    VideoBillboard,
    RenderingAndPerformance,
    DEFAULT_LIGHTS_FOG,
    Terrain,
    SpawnPoint,
    Volume,
    GenericSound,
    CurveEditor,
    TextEditor,
    SVGPathEditor,
    MaterialEditor,
}
