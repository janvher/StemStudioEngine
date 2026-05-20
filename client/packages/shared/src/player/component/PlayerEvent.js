
/**
 * Module: PlayerEvent.js
 * Purpose: Contains logic for player event.
 */

import * as THREE from "three";

import PlayerComponent from "./PlayerComponent";
import EventBus from "../../behaviors/event/EventBus";
import {getCachedAmmo} from "../../physics/ammo/ammo";
import Ajax from "../../utils/Ajax";

class PlayerEvent extends PlayerComponent {
    gameManager = null;
    boundEventHandlers = [];

    constructor(app) {
        super(app);
        this.gameManager = app.game;
    }

    create(scene, camera, renderer, scripts) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.scripts = scripts;
        this.physics = this.app.physics.physics;
        const ammo = getCachedAmmo() || this.physics?.ammo || this.physics?.engine?.ammo;

        var dom = renderer.domElement;

        this.events = Object.keys(scripts).map(uuid => {
            var script = scripts[uuid];
            // TODO
            return new Function(
                "app",
                "scene",
                "camera",
                "renderer",
                "THREE",
                "Ammo",
                "EventBus",
                "game",
                "physics",
                "ajax",
                script.source +
                    `
            var init = init || null;
            var start = start || null;
            var update = update || null;
            var stop = stop || null;
            var onClick = onClick || null;
            var onDblClick = onDblClick || null;
            var onKeyDown = onKeyDown || null;
            var onKeyUp = onKeyUp || null;
            var onMouseDown = onMouseDown || null;
            var onMouseMove = onMouseMove || null;
            var onMouseUp = onMouseUp || null;
            var onMouseWheel = onMouseWheel || null;
            var onResize = onResize || null;
            var onTouchStart = onTouchStart || null;
            var onTouchEnd = onTouchEnd || null;
            var onTouchMove = onTouchMove || null;
            var onVRConnected = onVRConnected || null;
            var onVRDisconnected = onVRDisconnected || null;
            var onVRSelectStart = onVRSelectStart || null;
            var onVRSelectEnd = onVRSelectEnd || null;
            return { init, start, update, stop, onClick, onDblClick, onKeyDown, onKeyUp, onMouseDown, onMouseMove, onMouseUp, onMouseWheel, onTouchStart, onTouchEnd, onTouchMove, onResize, onVRConnected, onVRDisconnected, onVRSelectStart, onVRSelectEnd };
            `,
            ).call(
                scene,
                this.app,
                scene,
                camera,
                renderer,
                THREE,
                ammo,
                EventBus,
                this.gameManager,
                this.physics,
                Ajax,
            );
        });

        this.events.forEach((n, i) => {
            const handlers = {};

            if (typeof n.onClick === "function") {
                handlers.onClick = n.onClick.bind(this.scene);
                dom.addEventListener("click", handlers.onClick);
            }
            if (typeof n.onDblClick === "function") {
                handlers.onDblClick = n.onDblClick.bind(this.scene);
                dom.addEventListener("dblclick", handlers.onDblClick);
            }
            //MISHA - key event listeners shouyld be added to the document
            if (typeof n.onKeyDown === "function") {
                handlers.onKeyDown = n.onKeyDown.bind(this.scene);
                document.addEventListener("keydown", handlers.onKeyDown);
            }
            if (typeof n.onKeyUp === "function") {
                handlers.onKeyUp = n.onKeyUp.bind(this.scene);
                document.addEventListener("keyup", handlers.onKeyUp);
            }
            if (typeof n.onMouseDown === "function") {
                handlers.onMouseDown = n.onMouseDown.bind(this.scene);
                dom.addEventListener("mousedown", handlers.onMouseDown);
            }
            if (typeof n.onMouseMove === "function") {
                handlers.onMouseMove = n.onMouseMove.bind(this.scene);
                dom.addEventListener("mousemove", handlers.onMouseMove);
            }
            if (typeof n.onMouseUp === "function") {
                handlers.onMouseUp = n.onMouseUp.bind(this.scene);
                dom.addEventListener("mouseup", handlers.onMouseUp);
            }
            if (typeof n.onMouseWheel === "function") {
                handlers.onMouseWheel = n.onMouseWheel.bind(this.scene);
                dom.addEventListener("mousewheel", handlers.onMouseWheel);
            }
            if (typeof n.onTouchStart === "function") {
                handlers.onTouchStart = n.onTouchStart.bind(this.scene);
                dom.addEventListener("touchstart", handlers.onTouchStart);
            }
            if (typeof n.onTouchEnd === "function") {
                handlers.onTouchEnd = n.onTouchEnd.bind(this.scene);
                dom.addEventListener("touchend", handlers.onTouchEnd);
            }
            if (typeof n.onTouchMove === "function") {
                handlers.onTouchMove = n.onTouchMove.bind(this.scene);
                dom.addEventListener("touchmove", handlers.onTouchMove);
            }
            if (typeof n.onResize === "function") {
                handlers.onResize = n.onResize.bind(this.scene);
                window.addEventListener("resize", handlers.onResize);
            }

            // Store handlers for removal later
            this.boundEventHandlers.push({script: n, handlers, index: i});
            if (typeof n.onVRConnected === "function") {
                this.app.on(`vrConnected.${this.id}-${i}`, n.onVRConnected.bind(this.scene));
            }
            if (typeof n.onVRDisconnected === "function") {
                this.app.on(`vrDisconnected.${this.id}-${i}`, n.onVRDisconnected.bind(this.scene));
            }
            if (typeof n.onVRSelectStart === "function") {
                this.app.on(`vrSelectStart.${this.id}-${i}`, n.onVRSelectStart.bind(this.scene));
            }
            if (typeof n.onVRSelectEnd === "function") {
                this.app.on(`vrSelectEnd.${this.id}-${i}`, n.onVRSelectEnd.bind(this.scene));
            }
        });

        return new Promise(resolve => {
            resolve();
        });
    }

    init() {
        this.events.forEach(n => {
            if (typeof n.init === "function") {
                n.init();
            }
        });
    }

    start() {
        this.events.forEach(n => {
            if (typeof n.start === "function") {
                n.start();
            }
        });
    }

    update(clock, deltaTime) {
        this.events.forEach(n => {
            if (typeof n.update === "function") {
                n.update(clock, deltaTime);
            }
        });
    }

    stop() {
        this.events?.forEach(n => {
            if (typeof n.stop === "function") {
                n.stop();
            }
        });
    }

    dispose() {
        const dom = this.renderer?.domElement;
        if (!dom || !this.boundEventHandlers) return;

        this.boundEventHandlers.forEach(({handlers}) => {
            if (handlers.onClick) {
                dom.removeEventListener("click", handlers.onClick);
            }
            if (handlers.onDblClick) {
                dom.removeEventListener("dblclick", handlers.onDblClick);
            }
            if (handlers.onKeyDown) {
                document.removeEventListener("keydown", handlers.onKeyDown);
            }
            if (handlers.onKeyUp) {
                document.removeEventListener("keyup", handlers.onKeyUp);
            }
            if (handlers.onMouseDown) {
                dom.removeEventListener("mousedown", handlers.onMouseDown);
            }
            if (handlers.onMouseMove) {
                dom.removeEventListener("mousemove", handlers.onMouseMove);
            }
            if (handlers.onMouseUp) {
                dom.removeEventListener("mouseup", handlers.onMouseUp);
            }
            if (handlers.onMouseWheel) {
                dom.removeEventListener("mousewheel", handlers.onMouseWheel);
            }
            if (handlers.onTouchStart) {
                dom.removeEventListener("touchstart", handlers.onTouchStart);
            }
            if (handlers.onTouchEnd) {
                dom.removeEventListener("touchend", handlers.onTouchEnd);
            }
            if (handlers.onTouchMove) {
                dom.removeEventListener("touchmove", handlers.onTouchMove);
            }
            if (handlers.onResize) {
                window.removeEventListener("resize", handlers.onResize);
            }
        });

        // Clear the bound handlers array
        this.boundEventHandlers = [];

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.scripts = null;
        this.events.length = 0;
    }
}

export default PlayerEvent;
