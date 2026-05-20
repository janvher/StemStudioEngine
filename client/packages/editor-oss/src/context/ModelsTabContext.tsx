import I18n from "i18next";
import {debounce, DebouncedFunc} from "lodash";
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Box3, Mesh, Object3D, Vector3} from "three";

import {useLibrariesContext} from ".";
import {saveScene} from "@stem/network/api/scene";
import EngineRuntime from "../EngineRuntime";
import ModelLoader from "../assets/js/loaders/ModelLoader";
import {AddObjectCommand, RemoveObjectCommand, SetScaleCommand} from "../command/Commands";
import {FileData} from "../editor/assets/v2/types/file";
import {ModelData, useListEditorModels} from "../editor/models/hooks/models";
import global from "../global";
import {showToast} from "../showToast";
import {backendUrlFromPath} from "../utils/UrlUtils";
import {generateUniqueName, getSceneUniqueModels, fetchModels, getObjectNamesInScene} from "../v2/pages/services";

interface ModelsTabContextValue {
    modelsData: FileData[] | undefined;
    modelsDataForSceneID: FileData[] | undefined;
    selectedItemId: string;
    handleFetchingModels: DebouncedFunc<(skipEventEmit?: boolean) => Promise<void>>;
    loadModelToScene: (id: string, onSuccess?: (obj: Object3D) => void, onError?: (error: unknown) => void) => void;
    handleDeleteFromScene: (id: string) => void;
    addLibraryIDToReq: boolean;
    setModelUploadCallback: React.Dispatch<React.SetStateAction<((modelData: any) => void) | null>>;
    modelUploadCallback: ((modelData: any) => void) | null;
    handleModelFinishedUpload: (modelData: any) => void;
    modelsForScene: ModelData[];
    setEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ModelsTabContext = React.createContext<ModelsTabContextValue>(null!);

export interface ModelsTabContextProviderProps {
    children: React.ReactNode;
    playMode?: boolean;
}

const ModelsTabContextProvider: React.FC<ModelsTabContextProviderProps> = ({children, playMode}) => {
    const app = global.app as EngineRuntime | undefined | null;
    const {activeSceneLibrary} = useLibrariesContext();

    const [modelsData, setModelsData] = useState<FileData[]>();
    const [modelsDataForSceneID, setModelsDataForSceneID] = useState<FileData[]>();
    const [selectedItemId, setSelectedItemId] = useState("");
    const [enabled, setEnabled] = useState(Boolean(app?.editor?.sceneID));
    const [modelUploadCallback, setModelUploadCallback] = useState<((modelData: any) => void) | null>(null);
    const modelsForScene = useListEditorModels({
        legacyModelsAsArg: modelsDataForSceneID,
        enabled,
    });
    const addLibraryIDToReq = !!activeSceneLibrary;

    useEffect(() => {
        app?.on(`objectSelected.ModelsTabContext`, handleObjectSelected);
        app?.on(`fetchModels.ModelsTabContext`, handleFetchingModels);
        app?.on(`sceneLoaded.ModelsTabContext`, () => {
            handleFetchingModels();
            setEnabled(Boolean(app?.editor?.sceneID));
        });
        app?.on(`objectAdded.ModelsTabContext`, null);
        app?.on(`objectRemoved.ModelsTabContext`, handleFetchingModels);

        return () => {
            if (playMode) return;
            app?.on(`objectSelected.ModelsTabContext`, null);
            app?.on(`fetchModels.ModelsTabContext`, null);
            app?.on(`sceneLoaded.ModelsTabContext`, null);
            app?.on(`objectAdded.ModelsTabContext`, null);
            app?.on(`objectRemoved.ModelsTabContext`, null);
            app?.on(`modelsFetched.ModelsTabContext`, null);
        };
    }, []);

    const handleModelFinishedUpload = (modelData: any) => {
        if (modelData && modelUploadCallback) {
            modelUploadCallback(modelData);
        }
        setModelUploadCallback(null);
    };

    const loadModelToScene = (id: string, onSuccess?: (obj: Object3D) => void, onError?: (error: unknown) => void) => {
        let loader = new ModelLoader();
        const data = (modelsData || []).concat(modelsDataForSceneID || []);
        const model = data?.find(item => item.ID === id);
        if (!model) {
            return;
        }

        const url = backendUrlFromPath(model.Url);

        if (!url) {
            return console.error("loadModelToScene got no url");
        }

        loader
            .load(url, model)
            .then(obj => {
                if (!obj) {
                    return;
                }

                obj.traverse(function (child: Object3D) {
                    if (child instanceof Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                const scene = app?.editor?.scene;
                if (scene) {
                    const existingNames = scene ? getObjectNamesInScene(scene) : new Set<string>();
                    obj.name = generateUniqueName(model.Name, existingNames);
                } else {
                    obj.name = model.Name;
                }

                Object.assign(obj.userData, model, {
                    Server: true,
                });

                if (app?.storage.addMode === "click") {
                    clickSceneToAdd(obj);
                } else {
                    app?.editor?.moveObjectToCameraClosestPoint(obj);
                    addToCenter(obj);
                }

                onSuccess?.(obj);
            })
            .catch((e: unknown) => {
                console.error("Error from loading model", e);
                showToast({type: "error", body: I18n.t("Could not load model")});
                onError?.(e);
            });
    };

    const handleObjectSelected = (object: Object3D | null) => {
        if (!object) {
            setSelectedItemId("");
            return;
        }

        let selected = object.userData.ID;
        setSelectedItemId(selected);
    };

    const handleFetchingModelsInternal = useCallback(
        async (skipEventEmit?: boolean) => {
            const res = await fetchModels();
            setModelsData((res as unknown as FileData[]) || []);
            if (app?.editor?.sceneID) {
                const sceneRes = await fetchModels(app.editor.sceneID);
                const sceneModels = getSceneUniqueModels(app.editor.scene);

                const combinedModels = [
                    ...sceneRes || [],
                    ...sceneModels.filter(sceneModel => !(sceneRes || []).some(model => model.ID === sceneModel.ID)),
                ];
                setModelsDataForSceneID((combinedModels as unknown as FileData[]) || []);
            }
            if (!skipEventEmit) {
                app?.call("modelsFetched");
            }
        },
        [app],
    );

    const handleFetchingModels = useMemo(
        () => debounce(handleFetchingModelsInternal, 100),
        [handleFetchingModelsInternal],
    );

    // Cleanup debounced function on unmount
    useEffect(() => {
        return () => {
            handleFetchingModels.cancel();
        };
    }, [handleFetchingModels]);

    const addToCenter = (obj: Object3D) => {
        console.log("Adding model to center", obj);
        if (obj.userData.DefaultSize) {
            const newSize = new Vector3(
                obj.userData.DefaultSize.x || 1,
                obj.userData.DefaultSize.y || 1,
                obj.userData.DefaultSize.z || 1,
            );
            const boundingBox = new Box3().setFromObject(obj);
            const originalSize = boundingBox.getSize(new Vector3());
            const scaleFactor = newSize.y / originalSize.y;
            const scale = new Vector3(scaleFactor, scaleFactor, scaleFactor);

            app?.editor?.execute(new SetScaleCommand(obj, scale)).catch(console.error);
        }

        app?.editor?.execute(new (AddObjectCommand as any)(obj)).catch(console.error);

        if (obj.userData.scripts) {
            obj.userData.scripts.forEach((n: unknown) => {
                app?.scripts.push(n);
            });
            app?.call("scriptChanged", obj);
        }
    };

    const clickSceneToAdd = (obj: Object3D) => {
        let added = false;
        if (app?.editor) {
            app.editor.gpuPickNum += 1;
        }
        app?.on(`gpuPick.ModelPanel`, (intersect: {point: Vector3}) => {
            if (!intersect.point) {
                return;
            }

            if (!added) {
                added = true;
                app?.editor?.sceneHelpers.add(obj);
            }
            obj.position.copy(intersect.point);
        });
        app?.on(`raycast.ModelPanel`, (intersect: {point: Vector3}) => {
            app.on(`gpuPick.ModelPanel`, null);
            app.on(`raycast.ModelPanel`, null);
            obj.position.copy(intersect.point);
            addToCenter(obj);
            if (app?.editor) {
                app.editor.gpuPickNum -= 1;
            }
        });
    };

    const handleDeleteFromScene = (id: string) => {
        if (!app?.editor) return;

        const deleteInstance = (id: string) => {
            const object = app?.editor?.modelByID(id);

            if (!object || !object.parent) {
                return;
            }

            app?.editor?.execute(new (RemoveObjectCommand as any)(object)).catch(console.error);

            deleteInstance(id);
        };

        deleteInstance(id);

        saveScene(true).catch(console.error);
    };

    return (
        <ModelsTabContext.Provider
            value={{
                modelsData,
                handleFetchingModels,
                selectedItemId,
                loadModelToScene,
                modelsDataForSceneID,
                handleDeleteFromScene,
                addLibraryIDToReq,
                setModelUploadCallback,
                modelUploadCallback,
                handleModelFinishedUpload,
                modelsForScene,
                setEnabled,
            }}
        >
            {children}
        </ModelsTabContext.Provider>
    );
};

export default ModelsTabContextProvider;
