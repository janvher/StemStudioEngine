
/**
 * Module: Helpers.js
 * Purpose: Contains logic for helpers.
 */


import BaseHelper from "./BaseHelper";
import CameraControlsHelper from "./CameraControlsHelper";
import CameraHelper from "./CameraHelper";
import GridHelper from "./GridHelper";
import HoverHelper from "./HoverHelper";
import DirectionalLightHelpers from "./light/DirectionalLightHelpers";
import HemisphereLightHelpers from "./light/HemisphereLightHelpers";
import PointLightHelpers from "./light/PointLightHelpers";
import RectAreaLightHelpers from "./light/RectAreaLightHelpers";
import SpotLightHelpers from "./light/SpotLightHelpers";

//import ViewHelper from "@web-shared/ViewHelper";
import SplineHelper from "./line/SplineHelper";
import OutlinerHelper from "./OutlinerHelper";
import SelectHelper from "./SelectHelper";

// import GodRaysHelpers from './light/GodRaysHelpers';

class Helpers extends BaseHelper {
    constructor() {
        super();
        this.helpers = [
            new GridHelper(),
            new CameraHelper(),
            new PointLightHelpers(),
            new DirectionalLightHelpers(),
            new HemisphereLightHelpers(),
            new RectAreaLightHelpers(),
            new SpotLightHelpers(),

            new CameraControlsHelper(),
            new OutlinerHelper(), // Must be before SelectHelper and HoverHelper to listen to their events
            new SelectHelper(),
            new HoverHelper(),
            //new ViewHelper(),
            new SplineHelper(),

        ];
    }

    start() {
        this.helpers.forEach(n => {
            n.start();
        });
    }

    stop() {
        this.helpers.forEach(n => {
            n.stop();
        });
    }
}

export default Helpers;
