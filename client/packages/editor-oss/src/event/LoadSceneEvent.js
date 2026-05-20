
/**
 * Module: LoadSceneEvent.js
 * Purpose: Contains logic for load scene event.
 */


import * as THREE from "three";
import {MathUtils} from "three";

import BaseEvent from "./BaseEvent";
// import GISScene from '@web-shared/gis/Scene';
import global from "../global";
import i8n from "../i18n/config";
import Converter from "../serialization/Converter";
import {showToast} from "../showToast";
import Ajax from "../utils/Ajax";
import {backendUrlFromPath} from "../utils/UrlUtils";

const {t} = i8n;

class LoadSceneEvent extends BaseEvent {
    constructor() {
        super();
    }

    start() {
        global.app.on(`load.${this.id}`, this.onLoad.bind(this));
        global.app.on(`loadSceneList.${this.id}`, this.onLoadSceneList.bind(this));
    }

    stop() {
        global.app.on(`load.${this.id}`, null);
        global.app.on(`loadSceneList.${this.id}`, null);
    }

    reset() {}

    onLoad(url, name, id, lockedItems, thumbnail) {
        // id: MongoDB _id
        const prevAutoSaveState = global.app.storage.autoSave;
        if (!name || name.trim() === "") {
            name = t("No Name");
        }

        // if (!id) {
        //     id = THREE.MathUtils.generateUUID();
        // }
        global.app.setAutoSave(false);

        global.app.editor.clear(false);
        document.title = name;

        global.app.mask(false);

        Ajax.get({
            url: backendUrlFromPath(url),
        }).then(res => {
            global.app.unmask();
            let data;
            if (res.data.Code) {
                if (res.data.Code !== 200) {
                    showToast({type: "warning", body: obj.Msg});
                    return;
                } else {
                    data = res.data.Data;
                }
            } else {
                data = res.data;
            }
            if (!data) {
                showToast({type: "warning", title: "Could not load a scene"});
                return;
            }

            this.onLoadSceneList(data, name, id, lockedItems, prevAutoSaveState, thumbnail);
        });
    }

    onLoadSceneList(list, name, id, lockedItems, prevAutoSaveState, thumbnail) {
        global.app.mask(false);
        new Converter()
            .fromJson(list, {
                server: global.app.options.server,
                camera: global.app.editor.camera,
                domWidth: global.app.editor.renderer.domElement.width,
                domHeight: global.app.editor.renderer.domElement.height,
            })
            .then(obj => {
                this.onLoadScene(obj);
                global.app.editor.sceneID = id || 0;
                global.app.editor.sceneName = name || t("No Name");
                global.app.editor.sceneLockedItems = lockedItems ? lockedItems.split(",") : [];
                global.app.editor.sceneThumbnail = thumbnail;
                document.title = global.app.editor.sceneName;

                if (obj.options) {
                    global.app.call("optionsChanged", this);
                }

                if (obj.scripts) {
                    global.app.call("scriptChanged", this);
                }

                if (obj.scene) {
                    global.app.call("sceneGraphChanged", this);
                }
                global.app.call("sceneLoaded", this);
                global.app.call(`clear`, global.app.editor, global.app.editor);
                global.app.setAutoSave(prevAutoSaveState);
            })
            .catch(error => {
                console.log("Error from loading scene:", error);
                global.app.setAutoSave(prevAutoSaveState);
                global.app.unmask();
                showToast({type: "error", title: "Creating scene failed"});
            });
    }

    async onLoadScene(obj) {
        console.log("onLoadScene");
        //console.log(obj);
        if (obj.options) {
            Object.assign(global.app.options, obj.options);
        }

        if (obj.camera) {
            global.app.camera.remove(global.app.editor.audioListener);
            global.app.camera.copy(obj.camera);
            let audioListener = global.app.editor.camera.children.filter(n => n instanceof THREE.AudioListener)[0];

            if (audioListener) {
                global.app.editor.audioListener = audioListener;
            }
        }

        if (obj.renderer) {
            const viewport = global.app.viewport;

            global.app.renderer.setSize(viewport.offsetWidth, viewport.offsetHeight);
            global.app.call("resize", this);
        }

        if (obj.scripts) {
            Object.assign(global.app.scripts, obj.scripts);
        }

        if (obj.scene) {
            //MISHA/PHASE2 - for Phase2 all scenes should be marked as games
            //TODO: remove after the Phase2 is completed
            // obj.scene.userData.game = {
            //     uuid: THREE.MathUtils.generateUUID()
            // }
            global.app.editor.setScene(obj.scene);
        }

        global.app.camera.updateProjectionMatrix();

        if (obj.options.selected) {
            var selected = global.app.editor.objectByUuid(obj.options.selected);
            if (selected) {
                global.app.editor.select(selected);
            }
        }

        global.app.call("enableVR", this, global.app.options.enableVR);

        global.app.call("animationChanged", this);
        global.app.unmask();
    }
}

export default LoadSceneEvent;
