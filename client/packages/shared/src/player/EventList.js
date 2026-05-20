
/**
 * Module: EventList.js
 * Purpose: Contains logic for event list.
 */


const EventList = [

    "init",
    "resize",
    // Application lifecycle (added for WebGPU migration)
    "appStart",
    "appStarted",
    // Render cycle hook events
    "beforeRender",
    "afterRender",
    "animate",
    // Mask / UI
    "showMask",
    // Scene events
    "sceneLoaded",
    "clear",
    // Storage changes
    "storageChanged",
    // WebGPU readiness
    "webgpuReady",

    "maskProgress",
    "vrConnected",
    "vrDisconnected",
    "vrSelectStart",
    "vrSelectEnd",
    "gameUpdated",
    "gameCreated",
    "gameStarted",
    "gameEnded",
    "pauseGame",
    "gameResumed",
    "gameTimerUpdate",
    "gameLogin_quit",
    "gameLogin_requested",
    "gameLogin_showReminder",
    "gameLogin_success",
    "lockEvent",
    "unlockEvent",
    "playerStarted",
    "removeGunAimer",
    "playingGame",
    "stoppedPlayingGame",
    "playerFallBack",
    "playerDead",
    "disposeEffectOutliner",
    "startVehicle",
    "stopVehicle",
    "updateVehicle",
    "disposeVehicle",
    "update3RD",
    "chatActivated",
    "chatDeactivated",
    "objectChanged",
    "objectAdded",
    "objectRemoved",
    "updateIndicator",
    "historyChanged",
    "objectArraySelected",
    "objectSelected",
    "obbLabelEdit",
    "angleUnitsSettingsChanged",
    "unitsSettingsChanged",
    "boundingBoxModeChanged",
    "sceneLoadFailed",
];

export default EventList;
