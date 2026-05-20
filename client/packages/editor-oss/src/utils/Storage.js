
/**
 * Module: Storage.js
 * Purpose: Contains logic for storage.
 */


import global from "../global";

class Storage {
    debug = false;
    autoSave = true;
    assetsPanelShow = true;
    sidebarShow = true;
    toolbarShow = true;
    timelinePanelShow = true;
    statusBarShow = true;

    showStats = true;
    showViewHelper = true;
    showCamera = false;
    showSkeleton = false;

    selectMode = "whole";
    selectedColor = "#ff6600"; // unity3d= #ff6600
    selectedThickness = 4;

    hoverEnabled = false;
    hoveredColor = "#ffff00";

    addMode = "center";
    controlMode = "FreeControls";

    constructor() {

        const defaultConfigs = {
            debug: false,
            autoSave: true,

            assetsPanelShow: true,
            sidebarShow: true,
            toolbarShow: true,
            timelinePanelShow: true,
            statusBarShow: true,

            showStats: true,
            showViewHelper: true,
            showCamera: false,
            showSkeleton: false,

            selectMode: "whole",
            selectedColor: "#ff6600", // unity3d: #ff6600
            selectedThickness: 4,

            hoverEnabled: false,
            hoveredColor: "#ffff00",

            addMode: "center",
            controlMode: "FreeControls",
        };

        let configs = this._getConfigs();

        Object.entries(defaultConfigs).forEach(n => {
            if (configs[n[0]] === undefined) {
                configs[n[0]] = n[1];
            }

            Object.defineProperty(this, n[0], {
                get: () => {
                    return this.get(n[0]);
                },
                set: value => {
                    this.set(n[0], value);
                },
            });
        });

        this._setConfigs(configs);
    }

    
    get(key) {
        let configs = this._getConfigs();
        return configs[key];
    }

    
    set(key, value) {
        let configs = this._getConfigs();
        configs[key] = value;
        this._setConfigs(configs);
        if (global.app.call) {
            global.app.call(`storageChanged`, this, key, value);
        } else {
            console.warn(`Storage: EventDispatcher has not been created.`);
        }
    }

    setConfigs(configs) {
        if (typeof configs !== "object") {
            console.warn(`Storage: configs should be an object.`);
            return;
        }
        let _configs = this._getConfigs();
        Object.keys(configs).forEach(n => {
            _configs[n] = configs[n];
        });
        this._setConfigs(_configs);
    }

    remove(key) {
        let configs = this._getConfigs();
        delete configs[key];
        this._setConfigs(configs);
    }

    clear() {
        window.localStorage.removeItem("configs");
    }

    _getConfigs() {
        let configs = window.localStorage.getItem("configs");
        if (!configs) {
            configs = "{}";
        }
        return JSON.parse(configs);
    }

    _setConfigs(configs) {
        window.localStorage.setItem("configs", JSON.stringify(configs));
    }
}

export default Storage;
