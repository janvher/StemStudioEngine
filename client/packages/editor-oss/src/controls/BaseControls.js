
/**
 * Module: BaseControls.js
 * Purpose: Contains logic for base controls.
 */


//import { dispatch } from '@web-shared/third_party';
import {dispatch} from "@web-shared/event/DispatchCompat";

let ID = -1;

/**
 *
 * @author tengge1 / https://github.com/tengge1
 */
class BaseControls {
    
    constructor(camera, domElement) {
        this.id = `${this.constructor.name}${ID--}`;

        this.camera = camera;
        this.domElement = domElement;

        this.enabled = true;

        this.dispatch = dispatch("change", "update", "end");

        this.call = this.dispatch.call.bind(this.dispatch);
        this.on = this.dispatch.on.bind(this.dispatch);
    }

    
    enable() {
        this.enabled = true;
    }

    
    disable() {
        this.enabled = false;
    }

    
    focus() {

    }


    update() {

    }


    setPickPosition() {

    }

    
    dispose() {
        this.camera = null;
        this.domElement = null;
    }
}

export default BaseControls;
