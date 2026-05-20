import I18n from "i18next";

export const javaScriptStarter = (id: string) => {
    return `
// ${I18n.t("In every script user has access to:")}  "scene", "camera", "renderer", "THREE", "Physics", "EventBus", "game"
// ${I18n.t("key objects:")}
// - scene - the THREE.SCENE object
// - camera - the THREE.CAMERA object
// - renderer - the THREE.RENDERER object
// - THREE -  the THREE instance
// - Physics - interface to the physics engine (running in the worker thread)
// - game - the GameManager instance


const objectUUID = '${id}';
const object = scene.getObjectByProperty('uuid', objectUUID);

// ${I18n.t("Execute before scene render")}
function init() {

}

// ${I18n.t("Execute after scene render")}
function start() {

}

// ${I18n.t("Execute each frame during running")}
// ${I18n.t("clock: deprecated, is always null, will be removed in the future")}
function update(clock, deltaTime) {

}

// ${I18n.t("Execute after program stopped")}
function stop() {

}

// ${I18n.t("Handle click event")}
function onClick(event) {

}

// ${I18n.t("Handle dblclick event")}
function onDblClick(event) {

}

// ${I18n.t("Handle keydown event")}
function onKeyDown(event) {

}

// ${I18n.t("Handle keyup event")}
function onKeyUp(event) {

}

// ${I18n.t("Handle mousedown event")}
function onMouseDown(event) {

}

// ${I18n.t("Handle mousemove event")}
function onMouseMove(event) {

}

// ${I18n.t("Handle mouseup event")}
function onMouseUp(event) {

}

// ${I18n.t("Handle mousewheel event")}
function onMouseWheel(event) {

}

// ${I18n.t("Handle touchstart event")}
function onTouchStart(event) {

}

// ${I18n.t("Handle touchend event")}
function onTouchEnd(event) {

}

// ${I18n.t("Handle touchmove event")}
function onTouchMove(event) {

}

// ${I18n.t("Handle resize event")}
function onResize(event) {

}

// ${I18n.t("Handle VR connected event")}
function onVRConnected(event) {

}

// ${I18n.t("Handle VR disconnected event")}
function onVRDisconnected(event) {

}

// ${I18n.t("Handle VR selectstart event")}
function onVRSelectStart(event) {

}

// ${I18n.t("Handle VR selectend event")}
function onVRSelectEnd(event) {

}
`;
};
