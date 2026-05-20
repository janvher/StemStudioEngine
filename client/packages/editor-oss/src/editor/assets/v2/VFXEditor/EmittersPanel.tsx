import {useCallback, useEffect, useRef, useState} from "react";
import styled from "styled-components";
import * as THREE from "three";
import {ParticleEmitter, ParticleSystem, QuarksUtil} from "three.quarks";

import {showRenameModal} from "./showRenameModal";
import {SingleEmitter} from "./SingleEmitter/SingleEmitter";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {DEFAULT_VFX_NAME} from "../../../../editor/Editor";
import global from "@stem/editor-oss/global";
import {ParticleSystemPreviewObject} from "../../../../object/particle/ParticleSystemPreviewObject";
import {collectEmitters} from "@stem/editor-oss/services";
import {EDITOR_TOP_NAV_HEIGHT} from "@stem/editor-oss/types/editor";
import {ElementsUtils} from "@stem/editor-oss/utils/ElementsUtils";
import {getVfxId} from "../../../../vfx/util";
import {useSaveVfx} from "../../../vfx/hooks/vfx";
import {StyledButton} from "../common/StyledButton";
import {Container as MainPanelContainer} from "../MaterialEditor/MainPanel/MainPanel";
import {ParticleEmitterPanel} from "../RightPanel/panels/ParticleEmitterPanel/ParticleEmitterPanel";

export type EmittersPanelActions = {
    onSave: () => void;
    onCloseRequest: () => void;
};

type Props = {
    onClose: () => void;
    onActionsReady?: (actions: EmittersPanelActions | null) => void;
};

export const EmittersPanel = ({onClose, onActionsReady}: Props) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor;
    const selectedObject = editor?.getSelectedObject();
    const initialSerializedStateRef = useRef<string | null>(null);

    const saveVfx = useSaveVfx();
    const [emittersList, setEmittersList] = useState(selectedObject ? collectEmitters(selectedObject) : []);
    const [newEmitters, setNewEmitters] = useState<Array<{emitter: ParticleEmitter; name: string}>>([]);

    const [emittersBackup, setEmittersBackup] = useState<
        {emitter: ParticleEmitter; parent: THREE.Object3D; systemBackup: any}[]
    >([]);
    const [materialsBackup, setMaterialsBackup] = useState<THREE.Material[]>([]);
    const [emitterSettings, setEmitterSettings] = useState<ParticleEmitter>();

    const serializeSelectedObject = useCallback(() => {
        if (!selectedObject || !editor) return null;
        try {
            return JSON.stringify(editor.serializeObject(selectedObject));
        } catch (error) {
            console.error("[VFXEditor] Failed to serialize current VFX state", error);
            return null;
        }
    }, [editor, selectedObject]);

    const hasVFXChanged = useCallback(() => {
        if (!selectedObject) return false;
        const initialState = initialSerializedStateRef.current;
        const currentState = serializeSelectedObject();
        if (initialState === null || currentState === null) {
            return initialState !== currentState;
        }
        return initialState !== currentState;
    }, [selectedObject, serializeSelectedObject]);

    useEffect(() => {
        if (!selectedObject) {
            initialSerializedStateRef.current = null;
            return;
        }
        initialSerializedStateRef.current = serializeSelectedObject();
    }, [selectedObject, serializeSelectedObject]);

    const restoreSelectedObject = useCallback(() => {
        if (!selectedObject) return;

        newEmitters.forEach(({emitter}) => {
            emitter.parent?.remove(emitter);
        });
        setNewEmitters([]);

        emittersBackup.forEach(({emitter, parent, systemBackup}) => {
            parent.children
                .filter(ch => ch instanceof ParticleEmitter && ch.uuid === emitter.uuid)
                .forEach(ch => parent.remove(ch));

            parent.add(emitter);

            const system = emitter.system as any;

            Object.assign(system, systemBackup);

            system.renderOrder = systemBackup.renderOrder;
            system.uTileCount = systemBackup.uTileCount;
            system.vTileCount = systemBackup.vTileCount;
            system.blendTiles = systemBackup.blendTiles;
            system.softNearFade = systemBackup.softNearFade;
            system.softFarFade = systemBackup.softFarFade;
            system.softParticles = systemBackup.softParticles;

            if (Array.isArray(systemBackup.behaviorsBackup)) {
                system.behaviors.length = 0;
                systemBackup.behaviorsBackup.forEach((b: any) => {
                    system.behaviors.push(b.clone?.() || b);
                });
            }

            system.emissionBursts.length = 0;
            systemBackup.emissionBurstsBackup.forEach((b: any) =>
                system.emissionBursts.push({
                    ...b,
                    count: b.count.clone?.() || b.count,
                }),
            );

            system.material = systemBackup.material.clone();
            system.material.needsUpdate = true;
            system.emitterShape = systemBackup.emitterShape.clone?.() || systemBackup.emitterShape;
            system.startColor = systemBackup.startColor.clone?.() || systemBackup.startColor;

            system.stop?.();
            system.play?.();

            // update preview
            emitter.traverse(child => {
                if (child instanceof ParticleSystemPreviewObject) {
                    child.particleSystem = system;
                    child.update();
                }
            });
        });

        let i = 0;
        selectedObject.traverse(child => {
            if ((child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) && materialsBackup[i]) {
                child.material = materialsBackup[i];
                child.material.needsUpdate = true;
                i++;
            }
        });

        setEmittersList(collectEmitters(selectedObject));
        initialSerializedStateRef.current = serializeSelectedObject();

        app.call("emitterUpdate");
        app.call("objectChanged", app.editor, selectedObject);

        onClose();
    }, [app, emittersBackup, materialsBackup, newEmitters, onClose, selectedObject, serializeSelectedObject]);

    const handleSave = useCallback(async () => {
        if (!selectedObject || !editor) return;

        const isNewVfx = selectedObject.userData.isTemplateVariant;
        const hasExistingAsset = getVfxId(selectedObject);

        if (isNewVfx || hasExistingAsset) {
            let particleName = selectedObject.name;

            if (isNewVfx && particleName.startsWith(DEFAULT_VFX_NAME)) {
                const newName = await showRenameModal(particleName);
                if (!newName) return;
                particleName = newName;
                selectedObject.name = newName;
            }

            // Clear ephemeral flag BEFORE serialization so stored data is clean
            selectedObject.userData.isTemplateVariant = false;

            try {
                const result = await saveVfx({selectedObject, name: particleName});
                if (!result) {
                    if (isNewVfx) selectedObject.userData.isTemplateVariant = true;
                    return;
                }
                app.call("finishedModelUpload", editor);
            } catch (error) {
                if (isNewVfx) {
                    selectedObject.userData.isTemplateVariant = true;
                }
                console.error("Failed to save particle effect:", error);
                return;
            }
        }

        QuarksUtil.runOnAllParticleEmitters(selectedObject, (emitter: ParticleEmitter) => {
            const system = emitter.system as ParticleSystem;

            if (system.material) {
                const oldMaterial = system.material;
                const newMaterial = oldMaterial.clone();
                newMaterial.needsUpdate = true;

                if ((newMaterial as THREE.MeshBasicMaterial).map) {
                    (newMaterial as THREE.MeshBasicMaterial).map!.needsUpdate = true;
                }
                system.material = newMaterial;
            }

            emitter.traverse(child => {
                if (child instanceof ParticleSystemPreviewObject) {
                    child.particleSystem = system;
                    child.update();
                }
            });

            app.batchedRenderer.updateSystem(system);
        });
        onClose();
    }, [app, editor, onClose, saveVfx, selectedObject]);

    const handleCloseRequest = useCallback(() => {
        if (!hasVFXChanged()) {
            onClose();
            return;
        }

        ElementsUtils.confirm({
            title: "Unsaved VFX Changes",
            content: "Do you want to save this VFX before closing?",
            okText: "Save",
            cancelText: "Close",
            onOK: () => {
                void handleSave();
            },
            onCancel: () => {
                restoreSelectedObject();
            },
            onClose: () => {
                restoreSelectedObject();
            },
        });
    }, [handleSave, hasVFXChanged, onClose, restoreSelectedObject]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                handleCloseRequest();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleCloseRequest]);

    useEffect(() => {
        if (!onActionsReady) return;

        onActionsReady({
            onSave: () => {
                void handleSave();
            },
            onCloseRequest: handleCloseRequest,
        });

        return () => {
            onActionsReady(null);
        };
    }, [onActionsReady]);

    useEffect(() => {
        if (!selectedObject) return;

        if (emittersBackup.length === 0) {
            const backup: typeof emittersBackup = [];

            selectedObject.traverse(child => {
                if (child instanceof ParticleEmitter) {
                    const system = child.system as any;

                    const originalBehaviors = Array.isArray(system.behaviors)
                        ? system.behaviors.map((b: any) => b.clone?.() || b)
                        : [];

                    const systemBackup: any = {...system};

                    // fields that require deep clone
                    if (system.material?.clone) systemBackup.material = system.material.clone();
                    if (system.emitterShape?.clone) systemBackup.emitterShape = system.emitterShape.clone();
                    if (system.startColor?.clone) systemBackup.startColor = system.startColor.clone();

                    systemBackup.behaviorsBackup = originalBehaviors;
                    systemBackup.emissionBurstsBackup = system.emissionBursts.map((b: any) => ({
                        ...b,
                        count: b.count.clone?.() || b.count,
                    }));
                    if (system.material.userData.blendColor) {
                        system.material.blendColor = new THREE.Color().fromArray(system.material.userData.blendColor);
                        system.material.needsUpdate = true;
                    }
                    // "renderer cached"
                    systemBackup.renderOrder = system.renderOrder;
                    systemBackup.uTileCount = system.uTileCount;
                    systemBackup.vTileCount = system.vTileCount;
                    systemBackup.blendTiles = system.blendTiles;
                    systemBackup.softNearFade = system.softNearFade;
                    systemBackup.softFarFade = system.softFarFade;
                    systemBackup.softParticles = system.softParticles;

                    backup.push({
                        emitter: child,
                        parent: child.parent!,
                        systemBackup,
                    });
                }
            });

            setEmittersBackup(backup);
        }

        if (materialsBackup.length === 0) {
            const mats: THREE.Material[] = [];
            selectedObject.traverse(child => {
                if ((child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) && child.material) {
                    mats.push(child.material.clone());
                }
            });
            setMaterialsBackup(mats);
        }

        setEmittersList(collectEmitters(selectedObject));
    }, [selectedObject]);

    const addEmitter = (particleSystem: ParticleSystem) => {
        setNewEmitters(prev => [...prev, {emitter: particleSystem.emitter, name: particleSystem.emitter.name}]);
        app.call("objectChanged");
    };

    if (!selectedObject) return null;

    return (
        <VFXMainPanelContainer>
            <ScrollContainer className="hidden-scroll">
                {emitterSettings ? (
                    <ParticleEmitterPanel
                        emitter={emitterSettings}
                        setEmitterSettings={setEmitterSettings}
                        goBack={() => setEmitterSettings(undefined)}
                    />
                ) : (
                    <>
                        <StyledButton
                            addPlusIcon
                            isBlue
                            style={{margin: "0 auto"}}
                            width="100%"
                            onClick={() => editor?.handleCreateParticleFromScratch(selectedObject, addEmitter)}
                            className="blueBtn"
                        >
                            Add New Emitter
                        </StyledButton>

                        <EmmitersWrapper>
                            {[...emittersList, ...newEmitters].map(({emitter, name}) => (
                                <SingleEmitter
                                    key={emitter.uuid}
                                    emitter={emitter}
                                    name={name}
                                    setEmittersList={setEmittersList}
                                    setNewEmitters={setNewEmitters}
                                    onClick={() => setEmitterSettings(emitter)}
                                />
                            ))}
                        </EmmitersWrapper>
                    </>
                )}
            </ScrollContainer>
        </VFXMainPanelContainer>
    );
};

const EmmitersWrapper = styled.div`
    display: flex;
    width: 100%;
    flex-direction: column;
    row-gap: 8px;
    justify-content: flex-start;
    align-items: flex-start;
    margin-top: 12px;
`;
const ScrollContainer = styled.div`
    width: 100%;
    height: auto;
`;

const VFXMainPanelContainer = styled(MainPanelContainer)`
    top: calc(${EDITOR_TOP_NAV_HEIGHT});
    height: calc(100svh - 60px - ${EDITOR_TOP_NAV_HEIGHT});
`;
