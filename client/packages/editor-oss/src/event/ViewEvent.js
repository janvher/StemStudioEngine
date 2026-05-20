
/**
 * Module: ViewEvent.js
 * Purpose: Contains logic for view event.
 */


import {Vector3} from "three";

import BaseEvent from "./BaseEvent";
import OrthographicCameraControls from "../controls/OrthographicCameraControls";
import global from "../global";

class ViewEvent extends BaseEvent {
    constructor() {
        super();
        this.changeView = this.changeView.bind(this);
    }

    start() {
        global.app.on(`changeView.${this.id}`, this.changeView);
    }

    stop() {
        global.app.on(`changeView.${this.id}`, null);
    }

    reset() {}

    changeView(view) {
        if (view === global.app.editor.view) {
            return;
        }

        global.app.editor.view = view;

        if (this.controls === undefined) {
            this.controls = new OrthographicCameraControls(
                global.app.editor.orthCamera,
                global.app.editor.renderer.domElement,
            );
        }

        if (view === "perspective") {
            global.app.editor.controls.enable();
            global.app.editor.showViewHelper = true;
            this.controls.disable();
            global.app.call(`viewChanged`, this, view);
            return;
        }

        let camera = global.app.editor.orthCamera;

        let distance = Math.max(
            global.app.editor.camera.position.x,
            global.app.editor.camera.position.y,
            global.app.editor.camera.position.z,
        );

        switch (view) {
            case "front":
                camera.position.set(distance, 0, 0);
                camera.lookAt(new Vector3());
                break;
            case "side":
                camera.position.set(0, 0, distance);
                camera.lookAt(new Vector3());
                break;
            case "top":
                camera.position.set(0, distance, 0);
                camera.lookAt(new Vector3());
                break;
        }

        global.app.editor.select(null);

        global.app.editor.controls.disable();
        global.app.editor.showViewHelper = false;
        this.controls.enable();
        global.app.call(`viewChanged`, this, view);
    }
}

export default ViewEvent;
