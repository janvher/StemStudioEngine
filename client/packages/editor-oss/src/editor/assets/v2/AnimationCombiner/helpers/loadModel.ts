import {Box3, Vector3, Object3D} from "three";

import ModelLoader from "../../../../../assets/js/loaders/ModelLoader";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";

type CallbackType = (object: Object3D) => void;

/**
 *
 * @param path
 * @param modelData
 * @param callback
 * @param handleError
 */
export default function loadModel(
    path: string,
    modelData: any,
    callback: CallbackType,
    handleError?: () => void,
): void {
    const app = (global as any).app;
    let loader = new (ModelLoader as any)(app);

    if (loader) {
        loader
            .load(path, modelData, {
                camera: app.editor.camera,
                renderer: app.editor.renderer,
                audioListener: app.editor.audioListener,
            })
            .then((object: any) => {
                if (!object) {
                    showToast({type: "error", title: "Failed to save model"});
                    handleError && handleError();
                    return;
                }

                object.name = name;

                Object.assign(object.userData, modelData, {
                    Server: true,
                });

                if (modelData.Type === "fbx") {
                    object.traverse((child: any) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    const box = new Box3().setFromObject(object);
                    const center = new Vector3();
                    box.getCenter(center);
                    object.position.sub(center);
                }

                callback(object);
            })
            .catch((e: any) => {
                showToast({type: "error", title: "Failed to save model"});
                handleError && handleError();
                console.log(e);
            });
    }
}

const renameChildren = (object: any) => {
    // Funkcja rekurencyjna do zmiany nazw dzieci obiektu
    const rename = (object: any) => {
        object.children.forEach((child: any) => {
            // Zmieniamy nazwę dziecka
            child.name = child.name.replace("mixamorig", "");
            // Rekurencyjnie zmieniamy nazwę dzieci tego dziecka
            if (child.children.length > 0) {
                rename(child);
            }
        });
    };

    // Wywołanie funkcji z początkowym obiektem i nową nazwą
    rename(object);
};

const renameObjAnimations = (object: any) => {
    object?._obj.animations.forEach((anim: any) => {
        // Zmieniamy nazwę dziecka
        anim.tracks.forEach((track: any) => {
            track.name = track.name.replace("mixamorig", "");
        });
    });
};
