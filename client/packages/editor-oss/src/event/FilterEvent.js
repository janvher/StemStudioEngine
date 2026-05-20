
/**
 * Module: FilterEvent.js
 * Purpose: Contains logic for filter event.
 */


import BaseEvent from "./BaseEvent";
import global from "../global";
import CssUtils from "../utils/CssUtils";

class FilterEvent extends BaseEvent {
    constructor() {
        super();
    }

    start() {
        global.app.on(`editorCleared.${this.id}`, this.onEditorCleared.bind(this));
        global.app.on(`optionsChanged.${this.id}`, this.onOptionsChanged.bind(this));
    }

    stop() {
        global.app.on(`editorCleared.${this.id}`, null);
        global.app.on(`optionsChanged.${this.id}`, null);
    }

    reset() {}

    onEditorCleared() {
        global.app.editor.renderer.domElement.style.filter = "";
    }

    onOptionsChanged() {
        global.app.editor.renderer.domElement.style.filter = CssUtils.serializeFilter(global.app.options);
    }
}

export default FilterEvent;
