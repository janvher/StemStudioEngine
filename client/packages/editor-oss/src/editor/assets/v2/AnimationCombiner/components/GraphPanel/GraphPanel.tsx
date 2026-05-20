import React, {ChangeEvent, useState, useRef} from "react";
import {Object3D} from "three";

import {useModelAnimationCombinerContext} from "@stem/editor-oss/context";
import loadModel from "../../helpers/loadModel";
import {AnimationList} from "../AnimationList";
import {UploadSection} from "../UploadSection";
import {AnimationButtonSection, GraphPanelContainer, LabelButton, Wrapper} from "./GraphPanel.style";

type Props = {
    model: Object3D | null;
};

export const GraphPanel = ({model}: Props) => {
    const {addAnimations, animations} = useModelAnimationCombinerContext();
    const [rootMotion, setRootMotion] = useState(false);
    const originalTrackValuesRef = useRef<Map<string, Float32Array | number[]>>(new Map());

    const getHipsTrack = (clip: any) => {
        return clip.tracks.find((track: any) => track.name === "Hips.position" && track.values.length % 3 === 0);
    };

    const applyRootMotion = () => {
        for (let i = 0; i < animations.length; i++) {
            const clip = animations[i];
            if (!clip) continue;
            const track = getHipsTrack(clip);
            if (track) {
                if (!originalTrackValuesRef.current.has(clip.uuid)) {
                    originalTrackValuesRef.current.set(clip.uuid, track.values.slice());
                }

                for (let j = 0; j < track.values.length; j += 3) {
                    track.values[j] = 0;
                    track.values[j + 2] = 0;
                }
            }
        }
    };

    const revertRootMotion = () => {
        for (let i = 0; i < animations.length; i++) {
            const clip = animations[i];
            if (!clip) continue;
            const track = getHipsTrack(clip);
            const original = originalTrackValuesRef.current.get(clip.uuid);
            if (track && original) {
                for (let j = 0; j < track.values.length; j++) {
                    track.values[j] = original[j];
                }
            }
        }
    };

    const handleRootMotionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setRootMotion(checked);
        if (checked) {
            applyRootMotion();
        } else {
            revertRootMotion();
        }
    };

    const onAnimationUpload = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length) {
            Array.from(event.target.files).forEach(element => {
                const fileUrl = URL.createObjectURL(element);
                const fileExt = element.name.split(".").pop() || "gltf";
                loadModel(fileUrl, {Type: fileExt}, (object: any) => {
                    let fileName = (element.name.split(".")[0] ?? "").replace(/\s/g, "");
                    fileName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
                    if (object.animations.length > 1) {
                        object.animations.forEach((anim: any, index: any) => {
                            if (!anim.userData) anim.userData = {};
                            anim.userData.isMixamo = anim.name === "mixamo.com";
                            anim.name = fileName + index;
                        });
                    } else if (object.animations.length === 1) {
                        const anim = object.animations[0];
                        if (!anim.userData) anim.userData = {};
                        anim.userData.isMixamo = anim.name === "mixamo.com";
                        if (anim.name === "Take 001") {
                            anim.name = "T-Pose (No Animation)";
                        } else {
                            anim.name = fileName;
                        }
                    }

                    const newAnims = [...object.animations || []];
                    const rawAnims = [...object._obj?.animations || []];
                    for (let i = 0; i < rawAnims.length; i++) {
                        const anim = rawAnims[i];
                        if (!newAnims.find(a => a.name === anim.name)) {
                            newAnims.push(anim);
                        }
                    }

                    // If root motion is enabled, apply it to new animations and store originals
                    if (rootMotion) {
                        for (let i = 0; i < newAnims.length; i++) {
                            const clip = newAnims[i];
                            const track = getHipsTrack(clip);
                            if (track && !originalTrackValuesRef.current.has(clip.uuid)) {
                                originalTrackValuesRef.current.set(clip.uuid, track.values.slice());
                                for (let j = 0; j < track.values.length; j += 3) {
                                    track.values[j] = 0;
                                    track.values[j + 2] = 0;
                                }
                            }
                        }
                    }

                    addAnimations(newAnims);
                });
            });
        }
    };
    return (
        <GraphPanelContainer>
            <AnimationButtonSection>
                <LabelButton>Animations</LabelButton>
            </AnimationButtonSection>
            <Wrapper>
                <AnimationList />
                <UploadSection onAnimationUpload={onAnimationUpload} />
            </Wrapper>
        </GraphPanelContainer>
    );
};
