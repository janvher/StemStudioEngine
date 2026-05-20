import I18n from "i18next";
import {useEffect, useState} from "react";
import {Object3D} from "three";
import * as THREE from "three";

import SceneLoader from "../../../../../../../assets/js/loaders/SceneLoader";
import {useAuthorizationContext} from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import Ajax from "@stem/editor-oss/utils/Ajax";
import StringUtils from "@stem/editor-oss/utils/StringUtils";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import {generateUniqueName} from "../../../../../../../v2/pages/services";
import {AssetsListLegacy, type AssetItem} from "../../../../common/AssetsListLegacy";
import {SearchInput} from "../../../../common/SearchInput";
import {FileData} from "../../../../types/file";
import {TitleContainer, TopContainer} from "../AssetsTab.style";

export const ScenesTab = () => {
    const {dbUser} = useAuthorizationContext();
    const [search, setSearch] = useState("");
    const [data, setData] = useState<FileData[]>();
    const [filteredData, setFilteredData] = useState<FileData[]>();

    const app = global.app;

    const update = () => {
        if (!dbUser) return;
        Ajax.get({url: backendUrlFromPath(`/api/Scene/List`)})
            .then(response => {
                const obj = response?.data;
                if (obj.Code !== 200) {
                    showToast({type: "warning", body: I18n.t(obj.Msg)});
                    return;
                }

                const filtered = obj.Data.filter((a: any) => a.ID !== app?.editor!.sceneID);

                filtered.sort((a: any, b: any) => new Date(b.UpdateTime).getTime() - new Date(a.UpdateTime).getTime());

                setData(filtered);

                app!.call("modelsFetched");
            })
            .catch(e => {
                console.error("Fetching scenes error:", e.message);
            });
    };

    const handleClick = async (id: string, callback?: any) => {
        let loader = new SceneLoader();
        let sceneData = data?.find(n => n.ID === id);
        let clone: THREE.Object3D | null = null;
        let uuidMap: Map<string, string> | null = null;
        if (sceneData) {
            if (id) {
                app!.editor?.component?.handleLoading(true);
                let url = backendUrlFromPath(`/api/Scene/Load?ID=${id}`);
                loader
                    .load(url || "")
                    .then(async (obj: any) => {
                        if (!obj) {
                            return;
                        }

                        obj.traverse(function (child: Object3D) {
                            if ((child as any).isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });

                        const existingNames = new Set<string>();
                        app!.editor?.scene.children.forEach((child: any) => {
                            if (child.name) {
                                existingNames.add(child.name);
                            }
                        });

                        obj.name = generateUniqueName(sceneData?.Name || "", existingNames);
                        app!.editor?.moveObjectToCameraClosestPoint(obj);
                        const data = await addToCenter(obj);
                        clone = data.clone;
                        uuidMap = data.uuidMap;

                        if (callback) callback(clone);
                    })
                    .catch(() => {
                        showToast({type: "error", body: "Could not load model"});
                    })
                    .finally(() => {
                        setTimeout(() => {
                            if (clone && uuidMap) {
                                updateUserDataBehaviors(clone, uuidMap);
                                app!.editor?.component?.handleLoading(false);

                                app!.call("objectChanged", this, clone);
                                app!.call("objectAdded", this, clone);
                                app!.call("objectChanged", this, clone);
                            }
                        }, 4000);
                    });
            }
        }
    };

    const replaceUuids = (object: any, uuidMap: Map<string, string>) => {
        Object.keys(object).forEach(key => {
            if (typeof object[key] === "string") {
                uuidMap.forEach((newUuid, originalUuid) => {
                    object[key] = object[key].replaceAll(originalUuid, newUuid);
                });
            } else if (typeof object[key] === "object") {
                replaceUuids(object[key], uuidMap);
            }
        });
    };

    const updateUserDataBehaviors = (object: THREE.Object3D, uuidMap: Map<string, string>) => {
        if (object.userData?.behaviors) {
            object.userData.behaviors.forEach((behavior: any) => {
                replaceUuids(behavior, uuidMap);
            });
        }

        object.children.forEach(child => updateUserDataBehaviors(child, uuidMap));
    };

    const addToCenter = async (scene: THREE.Group) => {
        scene.userData = {};
        const uuidMap = new Map<string, string>();
        const clone = await app!.editor!.createObjectClone(scene, uuidMap, true);

        app!.editor?.addObject(clone);

        return {clone, uuidMap};
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        e.dataTransfer.setData("asset-id", id);
        e.dataTransfer.setData("asset-type", "model");
    };

    useEffect(() => {
        update();

        app!.on(`fetchModels.ScenesTab`, update);
        return () => {
            app!.on(`fetchModels.ModelsTab`, null);
        };
    }, []);

    useEffect(() => {
        app!.on(`dragEnd.ScenesTab`, (type: string, id: string, position: any) => {
            if (type === "model") {
                handleClick(id, (obj: any) => {
                    app?.editor?.moveObjectToPoint(obj, position);
                });
            }
        });
        return () => {
            app!.on(`dragEnd.ScenesTab`, null);
        };
    }, [data]);

    useEffect(() => {
        if (!search) {
            setFilteredData(data);
            return;
        } else {
            setFilteredData(
                data?.filter(n => {
                    return n.Name.toLowerCase().indexOf(search.toLowerCase()) > -1;
                }),
            );
        }
    }, [search, data]);

    return (
        <>
            <TopContainer $searchActive={!StringUtils.isEmpty(search)}>
                <SearchInput width="224px" placeholder="Search" onChange={setSearch} value={search} alwaysOpen />
            </TopContainer>
            <TitleContainer>Stems</TitleContainer>

            {filteredData && (
                <AssetsListLegacy
                    data={filteredData as unknown as AssetItem[]}
                    selectedItemsIds={[]}
                    onClick={handleClick}
                    draggable
                    onDragStart={handleDragStart}
                    isScene
                />
            )}
        </>
    );
};
