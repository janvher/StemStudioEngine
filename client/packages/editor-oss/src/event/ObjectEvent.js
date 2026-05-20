
/**
 * Module: ObjectEvent.js
 * Purpose: Contains logic for object event.
 */


import {Box3, PerspectiveCamera} from "three";

import BaseEvent from "./BaseEvent";
import global from "../global";

class ObjectEvent extends BaseEvent {
    constructor() {
        super();
        this.box = new Box3();
    }

    start() {
        // global.app.on("objectAdded." + this.id, this.onObjectAdded.bind(this));
        global.app.on("objectChanged." + this.id, this.onObjectChanged.bind(this));
        // global.app.on("objectRemoved." + this.id, this.onObjectRemoved.bind(this));
        global.app.on("objectFocused." + this.id, this.onObjectFocused.bind(this));
    }

    stop() {
        // global.app.on("objectAdded." + this.id, null);
        global.app.on("objectChanged." + this.id, null);
        // global.app.on("objectRemoved." + this.id, null);
        global.app.on("objectFocused." + this.id, null);
    }

    reset() {}

    // NOTE: temporary commented out the code below, we don't use this functionality.
    // onObjectAdded(object) {
    //     var objects = global.app.editor.objects;

    //     object.traverse(function (child) {
    //         objects.push(child);
    //     });
    // }

    onObjectChanged(object) {
        if (object instanceof PerspectiveCamera) {
            object.updateProjectionMatrix();
        }
    }

    // NOTE: temporary commented out the code below, we don't use this functionality.
    // onObjectRemoved(object) {
    //     var objects = global.app.editor.objects;

    //     object.traverse(function (child) {
    //         objects.splice(objects.indexOf(child), 1);
    //     });
    // }

    onObjectFocused(object) {
        global.app.editor.controls.focus(object);
    }
}

export default ObjectEvent;
