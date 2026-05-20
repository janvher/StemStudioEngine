import {useCallback, useEffect, useState} from "react";
import styled from "styled-components";
import * as THREE from "three";
import {ParticleEmitter} from "three.quarks";

import global from "@stem/editor-oss/global";
import {allEmittersPlayer, collectEmitters, isVFXAutoStartEnabled, setVFXAutoStart} from "@stem/editor-oss/services";
import {PanelCheckbox} from "../../common/PanelCheckbox";
import {EditorButton} from "../../MainButtons";
import {TransformationSection} from "../../sections/TransformationSection";
import {PhysicsSection} from "../../sections/v2/PhysicsSection";

const isAnyEmitterPlaying = (object: THREE.Object3D): boolean => {
    let playing = false;
    object.traverse(child => {
        if (child instanceof ParticleEmitter && child.system && !child.system.paused) {
            playing = true;
        }
    });
    return playing;
};

export const BasicParticleEmitterPanel = () => {
    const app = global.app;
    const editor = app?.editor;

    const [locked, setLocked] = useState(false);
    const [autoStart, setAutoStart] = useState(false);
    const [preview, setPreview] = useState(false);
    const [selected, setSelected] = useState<THREE.Object3D | null>(null);

    const resolveVFXSelectionTarget = useCallback(
        (object: THREE.Object3D): THREE.Object3D => {
            if (object instanceof ParticleEmitter) {
                return object;
            }

            const emitters = collectEmitters(object);
            if (emitters.length === 1) {
                const singleEmitter = emitters[0];
                if (singleEmitter) {
                    return singleEmitter.emitter;
                }
            }

            return object;
        },
        [],
    );

    const sync = useCallback(() => {
        const rawSelected = editor?.selected;
        if (!rawSelected || Array.isArray(rawSelected)) return;

        const vfxSelection = resolveVFXSelectionTarget(rawSelected);
        setSelected(vfxSelection);
        setAutoStart(isVFXAutoStartEnabled(vfxSelection));
        setPreview(isAnyEmitterPlaying(vfxSelection));
    }, [editor, resolveVFXSelectionTarget]);

    const onSelected = useCallback(() => {
        sync();
    }, [sync]);

    useEffect(() => {
        if (editor && app) {
            onSelected();
            app.on(`objectSelected.BasicParticleEmitterPanel`, onSelected);
            app.on(`objectChanged.BasicParticleEmitterPanel`, sync);
        }

        return () => {
            app?.on(`objectSelected.BasicParticleEmitterPanel`, null);
            app?.on(`objectChanged.BasicParticleEmitterPanel`, null);
        };
    }, [app, editor, onSelected, sync]);

    useEffect(() => {
        const current = editor?.selected;
        if (current && !Array.isArray(current)) {
            setLocked(!!editor?.sceneLockedItems?.includes(current.uuid));
        }
    }, [editor?.sceneLockedItems, editor?.selected]);

    const handleAutoStart = () => {
        if (!selected) return;
        const nextAutoStart = !isVFXAutoStartEnabled(selected);
        setVFXAutoStart(selected, nextAutoStart);
        setAutoStart(nextAutoStart);
        allEmittersPlayer(selected, nextAutoStart ? "play" : "stop");
        app?.call(`objectChanged`, editor, selected);
    };

    return (
        <MainWrapper>
            <PanelCheckbox
                text="Auto Start"
                checked={autoStart}
                onChange={handleAutoStart}
                v2
                isGray
                regular
            />
            <TransformationSection
                justPosition
                isLocked={locked}
            />
            <PhysicsSection />
            <PanelCheckbox
                text="VFX Preview"
                checked={preview}
                onChange={() => {
                    if (!selected) return;
                    const next = !preview;
                    setPreview(next);
                    allEmittersPlayer(selected, next ? "play" : "stop");
                }}
                v2
                isGray
                regular
            />
            <EditorButton
                label="Edit Particle Effect"
                showEditor={() => {
                    if (
                        selected &&
                        editor?.selected &&
                        !Array.isArray(editor.selected) &&
                        editor.selected.uuid !== selected.uuid
                    ) {
                        editor.select(selected);
                    }
                    editor?.component?.setState({showVFXEditor: true});
                }}
            />
        </MainWrapper>
    );
};

const MainWrapper = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    flex-direction: column;
    row-gap: 12px;
    margin-top: -8px;
    height: calc(100% - 65px);
`;
