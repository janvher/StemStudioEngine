
/**
 * Module: EventDispatcher.js
 * Purpose: Contains logic for event dispatcher.
 */


import BaseEvent from "./BaseEvent";
import {dispatch} from "./DispatchCompat";
import EventList from "./EventList";
import FilterEvent from "./FilterEvent";
import GPUPickEvent from "./GPUPickEvent";
import ObjectEvent from "./ObjectEvent";
import PhysicsEvent from "./PhysicsEvent";
import PickEvent from "./PickEvent";
import RaycastEvent from "./RaycastEvent";
import RenderEvent from "./RenderEvent";
import ResizeEvent from "./ResizeEvent";
import ScriptChangedEvent from "./ScriptChangedEvent";
import TransformControlsEvent from "./TransformControlsEvent";
import ViewEvent from "./ViewEvent";
import global from "../global";

class EventDispatcher extends BaseEvent {
    constructor() {
        super();
        this.dispatch = dispatch.apply(dispatch, EventList);
        this.addDomEventListener();

        this.events = [

            new RenderEvent(),
            new ResizeEvent(),
            new FilterEvent(),
            new ViewEvent(),
            new GPUPickEvent(),
            // new WebSocketEvent(),
            new ScriptChangedEvent(),
            //new AutoSaveEvent(),

            new TransformControlsEvent(),
            new ObjectEvent(),
            new RaycastEvent(),
            new PickEvent(),

            new PhysicsEvent(),
        ];
    }

    
    start() {
        this.events.forEach(n => {
            n.start();
        });
    }

    
    stop() {
        this.events.forEach(n => {
            n.stop();
        });
    }

    reset() {
        this.events.forEach(n => {
            n.reset();
        });
    }

    
    call(eventName, _this, ...others) {
        this.dispatch.call(eventName, _this, ...others);
    }


    on(eventName, callback) {
        this.dispatch.on(eventName, callback);
    }


    off(eventName) {
        this.dispatch.off(eventName);
    }


    addDomEventListener() {
        const container = global.app.container;
        container.addEventListener("click", event => {
            this.dispatch.call("click", this, event);
        });
        container.addEventListener("dblclick", event => {
            this.dispatch.call("dblclick", this, event);
        });
        document.addEventListener("keydown", event => {
            this.dispatch.call("keydown", this, event);
        });
        document.addEventListener("keyup", event => {
            this.dispatch.call("keyup", this, event);
        });
        container.addEventListener("mousedown", event => {
            this.dispatch.call("mousedown", this, event);
        });
        container.addEventListener("mousemove", event => {
            this.dispatch.call("mousemove", this, event);
        });
        container.addEventListener("mouseup", event => {
            this.dispatch.call("mouseup", this, event);
        });
        container.addEventListener("mousewheel", event => {
            this.dispatch.call("mousewheel", this, event);
        });
        window.addEventListener(
            "resize",
            event => {
                this.dispatch.call("resize", this, event);
            },
            false,
        );
        document.addEventListener(
            "dragover",
            event => {
                this.dispatch.call("dragover", this, event);
            },
            false,
        );
        document.addEventListener(
            "drop",
            event => {
                this.dispatch.call("drop", this, event);
            },
            false,
        );
    }
}

export default EventDispatcher;
