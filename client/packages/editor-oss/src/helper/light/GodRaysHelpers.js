
/**
 * Module: GodRaysHelpers.js
 * Purpose: Contains logic for god rays helpers.
 */


import global from "../../global";
import GodRays from "@web-shared/postprocessing/GodRays";
import BaseHelper from "../BaseHelper";

class GodRaysHelpers extends BaseHelper {
    constructor() {
        super();
    }

    start() {
        this.ready = false;
        this.ray = new GodRays();
        this.ray.init(global.app.editor.scene, global.app.editor.camera, global.app.editor.renderer).then(() => {
            this.ready = true;
        });
        global.app.on(`afterRender.${this.id}`, this.onAfterRender.bind(this));
    }

    stop() {
        this.ready = false;
        this.ray.dispose();
        global.app.on(`afterRender.${this.id}`, null);
    }

    onAfterRender() {
        if (!this.ready) {
            return;
        }
        this.ray.render();
    }
}

export default GodRaysHelpers;
