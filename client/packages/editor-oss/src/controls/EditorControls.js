
/**
 * Module: EditorControls.js
 * Purpose: Contains logic for editor controls.
 */


import BaseControls from "./BaseControls";
import EditorControlsImpl from "../assets/js/controls/EditorControls";

/**
 *
 * @author tengge1 / https://github.com/tengge1
 */
class EditorControls extends BaseControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.controls = new EditorControlsImpl(camera, domElement);
    }

    enable() {
        this.enabled = true;
        this.controls.enabled = true;
    }

    disable() {
        this.enabled = false;
        this.controls.enabled = false;
    }

    focus(target) {
        this.controls.focus(target);
    }

    dispose() {
        this.controls.dispose();
        this.camera = null;
        this.domElement = null;
    }
}

export default EditorControls;
