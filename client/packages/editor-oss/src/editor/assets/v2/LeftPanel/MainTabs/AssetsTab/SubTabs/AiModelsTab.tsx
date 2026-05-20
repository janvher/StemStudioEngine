/**
 * Module: AiModelsTab.tsx
 * Purpose: Contains logic for ai models tab.
 */

import I18n from "i18next";
import JSZip from "jszip";
import {debounce} from "lodash";
import {useCallback, useState} from "react";
import * as THREE from "three";

import {getModelBySearch} from "@stem/network/api/animateAnything";
import {editModel} from "@stem/network/api/mesh";
import ModelLoader from "../../../../../../../assets/js/loaders/ModelLoader";
import {AddObjectCommand} from "@stem/editor-oss/command/Commands";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {IAnythingModel} from "@stem/editor-oss/types/animateAnything";
import AiModelUtils from "@stem/editor-oss/utils/AiModelUtils";
import Ajax from "@stem/editor-oss/utils/Ajax";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import {AiAssetsList} from "../../../../common/AiAsssetsList";

export const AiModelsTab = () => {
    const [search, setSearch] = useState("");
    const [data, setData] = useState<IAnythingModel[]>();
    const [error, setError] = useState("");
    const app = (global as any).app;

    const debouncedHandleSearch = useCallback(
        debounce(async search => {
            try {
                const models = await getModelBySearch(search);
                if (models) {
                    setError("");
                    setData(models.filter(n => AiModelUtils.isModelSupported(n)));
                }
            } catch (error: any) {
                setData(undefined);
                setError(error.message);
            }
        }, 500),
        [app],
    );

    const handleSearch = (value: string) => {
        setSearch(value);
        void debouncedHandleSearch(value);
    };

    const commitThumbnail = async (thumbnailUrl: string, data: any) => {
        await Ajax.post({
            url: backendUrlFromPath(`/api/Mesh/Edit`),
            data: {
                ID: data.ID,
                Name: data.Name,
                Image: thumbnailUrl,
                Category: data.CategoryID,
            },
            msgBodyType: "urlEncoded",
        });
    };

    const handleUploadThumbnail = (file: File, objData: any) => {
        Ajax.post({
            url: backendUrlFromPath(`/api/Upload`),
            data: {
                file,
            },
            msgBodyType: "multipart",
            //@ts-ignore
        })
            .then(response => {
                if (response?.data.Code === 200) {
                    const payload = {
                        ID: objData.ID,
                        Name: objData.Name,
                        Image: response.data.Data.url,
                    };
                    editModel(payload);
                }
            })
            .catch(() => {
                showToast({type: "error", body: "Request failed."});
            });
    };

    const onModelSelectedFromList = async (model: IAnythingModel) => {
        if (!model) {
            return;
        }
        const url = AiModelUtils.getModelUrl(model);

        if (!url) {
            showToast({type: "error", body: "Model is not supported"});
            return;
        }

        const modelName = model.newName || model.searchName;
        const array = url.split(".");
        const type = (array[array.length - 1] ?? "").split("?")[0];

        try {
            let response = await Ajax.get({url, needAuthorization: false});
            let data = await response?.data;
            const file = new File([data], `${modelName}.${type}`);

            const zipper = new JSZip();
            zipper.file(file.name, file);
            zipper.generateAsync({type: "blob"}).then(async zip => {
                const zippedFile = new File([zip], `${modelName}.zip`);
                try {
                    const meshAddResponse = await Ajax.post({
                        url: backendUrlFromPath(`/api/Mesh/Add`),
                        data: {
                            file: zippedFile,
                            IsAIGenerated: true,
                            SceneID: app.editor.sceneID,
                        },
                        msgBodyType: "multipart",
                    });
                    if (meshAddResponse?.data.Code === 200) {
                        //download the thumbnail for the model
                        const modelThumbnailResponse = await Ajax.get({
                            url: (model.thumbnails.aw_thumbnail || model.thumbnails.aw_reference),
                            needAuthorization: false,
                        });
                        const thumbnailBlob = await modelThumbnailResponse?.data;
                        // eslint-disable-next-line eqeqeq
                        if (thumbnailBlob == null) {
                            //TODO replace with a default thumbnail here
                            throw new Error("Thumbnail not found");
                        }
                        const file = new File(
                            [thumbnailBlob],
                            `${THREE.MathUtils.generateUUID()}.${thumbnailBlob.type.split("/")[1]}`,
                            {type: thumbnailBlob.type},
                        );

                        handleUploadThumbnail(file, meshAddResponse.data.Data);
                        loadModel(meshAddResponse.data.Data, model);
                    }
                } catch (error) {
                    console.log(error);
                }
            });
        } catch (error) {
            console.log(error);
        }
    };

    const loadModel = (objData: any, model: IAnythingModel) => {
        let loader = new (ModelLoader as any)(app);
        let url = backendUrlFromPath(objData.Url);
        loader
            .load(url, objData, {
                camera: app.editor.camera,
                renderer: app.editor.renderer,
                audioListener: app.editor.audioListener,
            })
            .then((obj: any) => {
                if (!obj) {
                    return;
                }
                obj.name = model.newName || model.searchName;

                Object.assign(obj.userData, objData, {
                    Server: true,
                });

                if (app.storage.addMode === "click") {
                    clickSceneToAdd(obj);
                } else {
                    app.editor.moveObjectToCameraClosestPoint(obj);
                    addToCenter(obj);
                }
            })
            .catch((e: any) => {
                showToast({type: "error", body: "Could not load model"});
                console.log(e);
            });
    };

    const addToCenter = (obj: any) => {
        app.editor.execute(new (AddObjectCommand as any)(obj));

        if (obj.userData.scripts) {
            obj.userData.scripts.forEach((n: any) => {
                app.scripts.push(n);
            });
            app.call("scriptChanged", obj);
        }
    };

    const clickSceneToAdd = (obj: any) => {
        let added = false;
        app.editor.gpuPickNum += 1;
        app.on(`gpuPick.ModelPanel`, (intersect: {point: any}) => {

            if (!intersect.point) {
                return;
            }
            if (!added) {
                added = true;
                app.editor.sceneHelpers.add(obj);
            }
            obj.position.copy(intersect.point);
        });
        app.on(`raycast.ModelPanel`, (intersect: {point: any}) => {

            app.on(`gpuPick.ModelPanel`, null);
            app.on(`raycast.ModelPanel`, null);
            obj.position.copy(intersect.point);
            addToCenter(obj);
            app.editor.gpuPickNum -= 1;
        });
    };

    return (
        <>
            <input className="search-input"
                type="text"
                value={search}
                onChange={e => handleSearch(e.target.value)}
            />

            {data && data.length > 0 ? 
                <AiAssetsList data={data}
                    onClick={onModelSelectedFromList}
                />
             : 
                <div className="no-data"
                    style={{textAlign: "center"}}
                >
                    {I18n.t(error || "No models found, use the search bar above to search for models")}
                </div>
            }
        </>
    );
};
