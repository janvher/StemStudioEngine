
/**
 * Module: AutoSaveEvent.js
 * Purpose: Contains logic for auto save event.
 */


import BaseEvent from "./BaseEvent";
import {saveScene} from "@web-shared/api/scene";
import global from "../global";
import i8n from "../i18n/config";
import Converter from "../serialization/Converter";
import {showToast} from "../showToast";
import {ElementsUtils} from "../utils/ElementsUtils";
import TimeUtils from "../utils/TimeUtils";

const {t} = i8n;

class AutoSaveEvent extends BaseEvent {
    constructor() {
        super();

        this.autoSave = true;
        this.autoSaveTime = 10000;
        this.saveProcess = null;
        this.queryLoad = false;

        this.handleSave = this.handleSave.bind(this);
        this.handleLoad = this.handleLoad.bind(this);

        this.handleStorageChange = this.handleStorageChange.bind(this);
    }

    start() {
        this.autoSave = global.app.storage.autoSave;
        global.app.on(`storageChanged.${this.id}`, this.handleStorageChange);
        global.app.on(`queryLoadAutoSceneScene.${this.id}`, this.handleLoad);

        if (this.autoSave) {
            this.saveProcess = setTimeout(this.handleSave, this.autoSaveTime);
        }
    }

    stop() {
        global.app.on(`storageChanged.${this.id}`, null);
        global.app.on(`queryLoadAutoSceneScene.${this.id}`, null);
    }

    reset() {}

    handleSave() {
        if (this.saveProcess) {
            clearTimeout(this.saveProcess);
        }

        if (global.app.editor && global.app.editor.sceneID === null) return;

        if (this.queryLoad) {
            if (this.autoSave) {
                this.saveProcess = setTimeout(this.handleSave, this.autoSaveTime);
            }
            return;
        }

        const app = global.app;
        const obj = new Converter().toJSON({
            options: global.app.options,
            camera: app.camera,
            scripts: app.scripts,
            scene: app.scene,
        });

        const now = TimeUtils.getDateTime("yyyy-MM-dd HH:mm:ss");

        window.localStorage.setItem("autoSaveData", JSON.stringify(obj));
        window.localStorage.setItem("autoSaveTime", now);
        window.localStorage.setItem("autoSaveSceneID", global.app.editor.sceneID);
        window.localStorage.setItem("autoSaveSceneName", global.app.editor.sceneName);
        window.localStorage.setItem("autoSaveSceneLockedItems", JSON.stringify(editor.sceneLockedItems || []));

        console.log(`${now}, scene auto saved.`);

        if (this.autoSave) {
            this.commitSaveScene(obj);
            this.saveProcess = setTimeout(this.handleSave, this.autoSaveTime);
        }
    }

    handleLoad() {
        const autoSaveTime = window.localStorage.getItem("autoSaveTime");
        const autoSaveData = window.localStorage.getItem("autoSaveData");
        const autoSaveSceneID = window.localStorage.getItem("autoSaveSceneID");
        const autoSaveSceneName = window.localStorage.getItem("autoSaveSceneName");
        const autoSaveSceneLockedItems = window.localStorage.getItem("autoSaveSceneLockedItems");

        if (!autoSaveData) {
            return;
        }

        this.queryLoad = true;

        ElementsUtils.confirm({
            title: t("Load Scene"),
            content: t("An auto-save scene was detected. Load?") + ` (${autoSaveTime})`,
            cancelText: t("Clear"),
            onOK: () => {
                this.queryLoad = false;
                this.commitLoadScene(autoSaveData, autoSaveSceneName, autoSaveSceneID, autoSaveSceneLockedItems);
            },
            onCancel: () => {
                window.localStorage.removeItem("autoSaveTime");
                window.localStorage.removeItem("autoSaveData");
                window.localStorage.removeItem("autoSaveSceneID");
                window.localStorage.removeItem("autoSaveSceneName");
                showToast({type: "info", title: t("Auto-save scene is cleared.")});
                this.queryLoad = false;
            },
        });
    }

    commitLoadScene(data, name, id, lockedItems) {
        var obj = JSON.parse(data);
        const lockedItemsList = JSON.parse(lockedItems);
        const lockedItemsData = lockedItemsList ? lockedItemsList.join(",") : "";

        const prevAutoSaveState = global.app.storage.autoSave;
        global.app.setAutoSave(false);

        if (obj) {
            global.app.call(`loadSceneList`, this, obj, name, id, lockedItemsData, prevAutoSaveState);
        }
    }

    handleStorageChange(name, value) {
        if (name !== "autoSave") {
            return;
        }
        this.autoSave = value;

        if (this.autoSave) {
            if (this.saveProcess) {
                clearTimeout(this.saveProcess);
            }
            this.saveProcess = setTimeout(this.handleSave, this.autoSaveTime);
        }
    }

    commitSaveScene(_experience) {
        const app = global.app;
        const editor = app.editor;

        if (editor.sceneName) {
            saveScene();
        }
    }
}

export default AutoSaveEvent;
