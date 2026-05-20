import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "./Object3DSerializer";
import ModelLoader from "../../assets/js/loaders/ModelLoader";
import {applyMaterialSettingsToObject} from "@web-shared/editor/assets/v2/materials/materialUtils";
import ShadowUtils from "@web-shared/utils/ShadowUtils";

/**
 * ServerObject - Handles loading and serialization of objects from server
 *
 * This class handles the serialization and deserialization of objects
 * that are stored on the server, managing their URLs and loading process.
 */
class ServerObject extends BaseSerializer {
    constructor(convertServerObjUrls = false) {
        super();
        this.convertServerObjUrls = convertServerObjUrls;
    }
    toJSON(obj) {
        var json = Object3DSerializer.prototype.toJSON.call(this, obj);

        const url = json.userData.Url;
        const absoluteUrl = new URL(url.startsWith("http") ? url : location.origin + url);

        json.userData = Object.assign({}, obj.userData);
        if (this.convertServerObjUrls && url && !url.startsWith("http")) {
            json.userData.Url = absoluteUrl;
        } else {
            json.userData.Url = url.replace(absoluteUrl.origin, "");
        }

        delete json.userData.model;
        delete json.userData.helper;
        delete json.userData.animation;
        delete json.userData.Thumbnail;

        return json;
    }

    fromJSON(json, parent, options, revertUUID = true) {
        let url = json.userData.Url;

        const modelUrl = new URL(url.startsWith("http") ? url : (options.server || '') + url);

        url = url.replace(modelUrl.origin, "");

        // Pass server to MMDLoader to allow it to download resources
        options.skipChildrenClear = true;
        const loader = new ModelLoader();

        return new Promise(resolve => {
            void loader.load(url, json.userData, options).then(obj => {
                if (obj) {
                    Object3DSerializer.prototype.fromJSON.call(this, json, obj, {...options, revertUuid: revertUUID});

                    obj.userData = Object.assign({}, json.userData);

                    // Restore original model UUIDs
                    if (revertUUID && Array.isArray(json.userData._children)) {
                        this.revertUUID(obj.children, json.userData._children);
                    }

                    ShadowUtils.applyShadowSettings(obj, json);
                    ShadowUtils.applyFogSettings(obj, json);

                    if (obj.userData.materialSettings) {
                        applyMaterialSettingsToObject(obj, obj.userData.materialSettings, options.assetResolutionContext);
                    }

                    resolve(obj);
                } else {
                    resolve(null);
                }
            });
        });
    }

    /**
     * Restores the original UUIDs to model parts
     * @param {THREE.Object3D[]} children - The child objects
     * @param {Array} list - The original UUID list
     */
    revertUUID(children, list) {
        for (let i = 0; i < children.length; i++) {
            let child = children[i];

            if (list[i]) {
                child.uuid = list[i].uuid;
            }

            if (child.children && list[i] && list[i].children) {
                this.revertUUID(child.children, list[i].children);
            }
        }
    }
    /**
     * Extracts the main domain from a hostname
     * e.g., 'next.example.test' -> 'example.test', 'example.test' -> 'example.test'
     * @param {string} hostname - The hostname to extract the main domain from
     * @returns {string} The main domain (last two parts of the hostname)
     */
    getMainDomain = hostname => {
        const parts = hostname.split(".");
        // Get last two parts (domain.tld)
        return parts.length >= 2 ? parts.slice(-2).join(".") : hostname;
    };
}

export default ServerObject;
