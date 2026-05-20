import {useCallback, useEffect, useRef, useState} from "react";

import {handleAddFire, handleAddSmoke, handleAddWater} from "./primitivesHelpers";
import {AssetType} from "@stem/network/api/asset";
import {deleteParticle, getParticle, getParticlesList, saveParticle} from "@stem/network/api/particle";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {setAssetRevision as objectSetAssetRevision} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {ElementsUtils} from "@stem/editor-oss/utils/ElementsUtils";
import {setVfxId} from "../../../../../../../vfx/util";
import {
    useGetAssetRevisionData,
    useListEditorAssets,
    useUpdateAsset,
} from "../../../../../../asset-management/hooks/assets";
import {useRemoveAssetsAndInstancesFromScene} from "../../../../../../asset-management/hooks/scene";
import {IconsFlexContainer, IList, ItemActionsArgs} from "../../../../common/IconsFlexContainer";
import effectIcon from "../../../../icons/assetsTab/particles/effect.svg";
import fireIcon from "../../../../icons/assetsTab/primitives/Fire.svg";
import smokeIcon from "../../../../icons/assetsTab/primitives/Smoke.svg";
import waterIcon from "../../../../icons/assetsTab/primitives/Water.svg";
import {showRenameModal} from "../../../../VFXEditor/showRenameModal";

const DELETE_WARNING = "Are you sure you want to delete this effect? This action cannot be undone.";

enum VFX_NAME {
    FIRE = "Fire",
    SMOKE = "Smoke",
    WATER = "Water",
}

const VFX_LIST = [
    {icon: fireIcon, text: VFX_NAME.FIRE, name: VFX_NAME.FIRE},
    {icon: smokeIcon, text: VFX_NAME.SMOKE, name: VFX_NAME.SMOKE},
    {icon: waterIcon, text: VFX_NAME.WATER, name: VFX_NAME.WATER},
];

export const ParticleEffectsTab = ({search}: {search: string}) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor;
    const [list, setList] = useState<IList[]>([]);
    const [filteredData, setFilteredData] = useState<IList[]>([]);
    const [filteredVfxList, setFilteredVfxList] = useState<IList[]>(VFX_LIST);
    const orgListRef = useRef<null | any[]>(null);

    const {data} = useListEditorAssets({
        types: [AssetType.Quarks],
    });
    const removeAssetsAndInstancesFromScene = useRemoveAssetsAndInstancesFromScene();
    const getAssetRevisionData = useGetAssetRevisionData();
    const updateAsset = useUpdateAsset();

    const legacyClick = async (item: any, callback?: (obj: any) => void) => {
        const particle = await fetchParticle(item.id);
        if (particle) {
            const particleJSON = JSON.parse(particle.Data);

            let obj = await editor?.deserializeObjectFromArray(particleJSON);

            if (obj) {
                obj = obj.clone();
                obj.userData.isVFX = true;
                await editor?.addObject(obj);
                editor?.select(obj);
                if (callback) {
                    callback(obj);
                }
            } else {
                showToast({
                    type: "error",
                    body: `Failed to load particle effect: ${item.name}`,
                });
            }
        } else {
            throw new Error("Particle not found");
        }
    };

    const handleClick = async (item: any, callback?: (obj: any) => void) => {
        const foundNewAPIAsset = data?.assets.find(el => el.id === item.id);
        try {
            if (foundNewAPIAsset) {
                if (!editor) return;
                const revisionData = await getAssetRevisionData(foundNewAPIAsset.id, foundNewAPIAsset.headRevisionId);

                const serialized = revisionData; // JSON do deserialize
                let obj = await editor.deserializeObjectFromArray(serialized);

                if (obj) {
                    obj = obj.clone();
                    obj.userData.isVFX = true;
                    setVfxId(obj, foundNewAPIAsset.id);
                    objectSetAssetRevision(editor.scene, foundNewAPIAsset.id, foundNewAPIAsset.headRevisionId);
                    await editor.addObject(obj);
                    editor.select(obj);
                    if (callback) callback(obj);
                } else {
                    showToast({
                        type: "error",
                        body: `Failed to load particle effect: ${item.name}`,
                    });
                }
            } else {
                legacyClick(item, callback);
            }
        } catch (error) {
            console.error("Error loading particle effect:", error);
            showToast({
                type: "error",
                body: `Failed to load particle effect`,
            });
            return;
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: any) => {
        e.dataTransfer.setData("asset-id", item.id);
        e.dataTransfer.setData("asset-type", "particle");
    };

    const fetchParticle = async (id: string) => {
        try {
            const particle = await getParticle(id);
            return particle;
        } catch (error) {
            console.error("Error fetching particle:", error);
            return null;
        }
    };

    const loadList = async () => {
        try {
            const particles = await getParticlesList();
            const mappedParticlesLegacy = particles.map(p => ({
                id: p.ID,
                name: p.Name,
                icon: effectIcon,
                type: "particle",
                text: p.Name,
            }));
            const mappedParticles = (data?.assets || []).map(p => ({
                id: p.id,
                name: p.name,
                icon: effectIcon,
                type: "particle",
                text: p.name,
            }));

            const newList = mappedParticles.concat(mappedParticlesLegacy);
            setList(newList);
            setFilteredData(newList);
        } catch (error) {
            console.error("Error loading particle effects:", error);
        }
    };

    useEffect(() => {
        orgListRef.current = list;
    }, [list]);

    useEffect(() => {
        setListWithSearch();
    }, [search]);

    const setListWithSearch = useCallback(() => {
        if (!search) {
            setFilteredData(list);
            setFilteredVfxList(VFX_LIST);
            return;
        }

        setFilteredData(
            list.filter(n => {
                return n.name.toLowerCase().indexOf(search.toLowerCase()) > -1;
            }),
        );
        setFilteredVfxList(
            VFX_LIST.filter(n => {
                return n.name.toLowerCase().indexOf(search.toLowerCase()) > -1;
            }),
        );
    }, [search, list]);

    useEffect(() => {
        app.on(`finishedModelUpload.ParticleEffectsTab`, loadList);

        return () => {
            app.on(`finishedModelUpload.ParticleEffectsTab`, null);
        };
    }, []);

    useEffect(() => {
        void loadList();
    }, [data?.assets]);

    useEffect(() => {
        app.on(`dragEnd.ParticleEffectsTab`, (type: string, id: string, position: any) => {
            if (type === "particle") {
                const particleEffect = orgListRef.current?.find(p => p.id === id);
                void handleClick(particleEffect, (obj: any) => {
                    app.editor?.moveObjectToPoint(obj, position);
                });
            }
            if (type === "vfx") {
                handleVfxClick(id as VFX_NAME, (obj: any) => {
                    app.editor?.moveObjectToPoint(obj, position);
                });
            }
        });
        return () => {
            app.on(`dragEnd.ParticleEffectsTab`, null);
        };
    }, []);

    const handleVfxClick = (name: VFX_NAME, callback?: any) => {
        switch (name) {
            case VFX_NAME.FIRE:
                handleAddFire(app, callback);
                break;
            case VFX_NAME.SMOKE:
                handleAddSmoke(app, callback);
                break;
            case VFX_NAME.WATER:
                handleAddWater(app, callback);
                break;
            default:
                break;
        }
    };

    const handleVfxDragStart = (e: React.DragEvent<HTMLDivElement>, name: string) => {
        e.dataTransfer.setData("asset-id", name);
        e.dataTransfer.setData("asset-type", "vfx");
    };

    const showDeleteWarning = (args: ItemActionsArgs) => {
        const foundNewAPIAsset = data?.assets.find(el => el.id === args.id);
        if (foundNewAPIAsset) {
            // removeAssetsAndInstancesFromScene shows its own confirm dialog
            removeAssetsAndInstancesFromScene([args.id]).catch(console.error);
        } else {
            ElementsUtils.confirm({
                title: "Warning!",
                content: DELETE_WARNING,
                onOK: async () => {
                    await deleteEffect(args);
                },
            });
        }
    };

    const deleteEffect = async (args: ItemActionsArgs) => {
        await deleteParticle(args.id);
        app.call("finishedModelUpload", editor);
    };

    const legacySaveName = async (id: string, particleName: string) => {
        try {
            const particle = await fetchParticle(id);
            if (!particle) throw Error("No particle effect found by ID");

            const particleJSON = JSON.parse(particle.Data);
            await saveParticle(id, particleName, JSON.stringify(particleJSON));
            app.call("finishedModelUpload", editor);
        } catch (error) {
            console.error("Failed to save particle effect:", error);
        }
    };

    const saveNewName = async (args: ItemActionsArgs) => {
        if (!editor) return;

        const {id, name} = args;
        let particleName = name;

        const newName = await showRenameModal(particleName);
        if (!newName) return;
        particleName = newName;
        const foundNewAPIAsset = data?.assets.find(el => el.id === id);
        if (foundNewAPIAsset) {
            await updateAsset.mutateAsync({
                assetId: id,
                name: newName,
            });
        } else {
            legacySaveName(id, particleName);
        }
    };

    return (
        <>
            <IconsFlexContainer
                list={filteredVfxList}
                onSelectItem={item => handleVfxClick(item.name as VFX_NAME)}
                disableSelection
                draggable
                onDragStart={(e, item) => handleVfxDragStart(e, item.name)}
            />
            <IconsFlexContainer
                list={filteredData}
                onSelectItem={handleClick}
                disableSelection
                draggable
                onDragStart={handleDragStart}
                onDelete={showDeleteWarning}
                onEdit={(args: ItemActionsArgs) => saveNewName(args)}
            />
        </>
    );
};
