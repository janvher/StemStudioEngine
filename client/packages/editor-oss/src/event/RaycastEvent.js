
/**
 * Module: RaycastEvent.js
 * Purpose: Contains logic for raycast event.
 */


import {Plane, Raycaster, Vector2, Vector3} from "three";

import BaseEvent from "./BaseEvent";
import global from "../global";

class RaycastEvent extends BaseEvent {
    constructor() {
        super();
        this.mouse = new Vector2();
        this.raycaster = new Raycaster();
    }

    start() {
        global.app.on(`mousedown.${this.id}`, this.onMouseDown.bind(this));
        global.app.on(`mouseup.${this.id}`, this.onMouseUp.bind(this));
    }

    stop() {
        global.app.on(`mousedown.${this.id}`, null);
        global.app.on(`mouseup.${this.id}`, null);
    }

    reset() {}

    onMouseDown(event) {
        if (!global.app.editor) {
            return;
        }
        if (event.target !== global.app.editor.renderer.domElement) {
            return;
        }

        this.isDown = true;
        this.x = event.offsetX;
        this.y = event.offsetY;
    }

    onMouseUp(event) {
        if (!global.app.editor) {
            return;
        }
        if (event.target !== global.app.editor.renderer.domElement) {
            return;
        }

        if (!this.isDown || this.x !== event.offsetX || this.y !== event.offsetY) {
            return;
        }

        let domElement = global.app.editor.renderer.domElement;

        this.mouse.x = event.offsetX / domElement.clientWidth * 2 - 1;
        this.mouse.y = -event.offsetY / domElement.clientHeight * 2 + 1;

        this.raycaster.setFromCamera(
            this.mouse,
            global.app.editor.view === "perspective" ? global.app.editor.camera : global.app.editor.orthCamera,
        );

        let intersects = this.raycaster.intersectObjects(global.app.editor.scene.children, true);

        if (intersects.length > 0) {
            global.app.call("raycast", this, intersects[0], event);
            global.app.call("intersect", this, intersects[0], event, intersects);
        } else {

            let plane = new Plane().setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), new Vector3());
            let target = new Vector3();
            this.raycaster.ray.intersectPlane(plane, target);

            global.app.call(
                "raycast",
                this,
                {
                    point: target,
                    distance: this.raycaster.ray.distanceSqToPoint(target),
                    object: null,
                },
                event,
            );
        }
    }
}

export default RaycastEvent;
