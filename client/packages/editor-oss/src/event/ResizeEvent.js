
/**
 * Module: ResizeEvent.js
 * Purpose: Contains logic for resize event.
 *
 * Uses ResizeObserver on the viewport element to detect container-level
 * resizes (panel toggles, sidebar drags) in addition to window resizes.
 * The actual resize work is deferred to the next animation frame via a
 * pending flag, avoiding redundant setSize/updateProjectionMatrix calls
 * during rapid resize sequences.
 */


import BaseEvent from "./BaseEvent";
import global from "../global";

class ResizeEvent extends BaseEvent {
    constructor() {
        super();
        this._resizeObserver = null;
        this._resizePending = false;
    }

    start() {
        global.app.on(`resize.${this.id}`, this._onResizeEvent.bind(this));
        global.app.on(`animate.ResizeEvent`, this._flushPendingResize.bind(this));

        const viewport = global.app.viewport;
        if (viewport && typeof ResizeObserver !== "undefined") {
            this._resizeObserver = new ResizeObserver(() => {
                this._resizePending = true;
            });
            this._resizeObserver.observe(viewport);
        }
    }

    stop() {
        global.app.on(`resize.${this.id}`, null);
        global.app.on(`animate.ResizeEvent`, null);

        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        this._resizePending = false;
    }

    reset() {}

    /**
     * Called when the app dispatches a manual "resize" event (e.g. on sceneLoaded).
     * Applies immediately.
     */
    _onResizeEvent() {
        this._applyResize();
    }

    /**
     * Called every animation frame. Only does work when a ResizeObserver
     * callback has flagged a pending resize.
     */
    _flushPendingResize() {
        if (!this._resizePending) return;
        this._resizePending = false;
        this._applyResize();
    }

    _applyResize() {
        let {editor, viewport, rendererCSS} = global.app;
        if (editor == null || viewport == null || rendererCSS == null) {
            return;
        }
        let {camera, orthCamera, renderer} = editor;

        const width = viewport.clientWidth;
        const height = viewport.clientHeight;

        if (this.width === undefined || this.height === undefined) {
            this.width = width;
            this.height = height;
        }

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        if (width !== this.width) {
            let dwidth = (orthCamera.right - orthCamera.left) * (width / this.width - 1);

            orthCamera.left -= dwidth / 2;
            orthCamera.right += dwidth / 2;

            this.width = width;
        }

        if (height !== this.height) {
            let dheight = (orthCamera.top - orthCamera.bottom) * (height / this.height - 1);

            orthCamera.top += dheight / 2;
            orthCamera.bottom -= dheight / 2;

            this.height = height;
        }

        orthCamera.updateProjectionMatrix();

        renderer.setSize(width, height);
        rendererCSS?.setSize(width, height);
    }
}

export default ResizeEvent;
