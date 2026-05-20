import { AnimationClip } from 'three';

import ModelLoader from "../../../../../../../../assets/js/loaders/ModelLoader";
import global from "@stem/editor-oss/global";

const ANIMATION_NAMES = ["Idle", "Walking", "Slow Run", "Jumping"];

export const loadAnimations = async (abortSignal: AbortSignal) => {
    abortSignal.throwIfAborted();

    const promises = ANIMATION_NAMES.map(async (fileName: string) => {
        abortSignal.throwIfAborted();

        const loader = new ModelLoader();
        const obj = await loader.load(
            `/assets/animations/mixamo/${fileName}.fbx`,
            { Type: "fbx" },
            {
                camera: global.app?.editor?.camera,
                renderer: global.app?.editor?.renderer,
                audioListener: global.app?.editor?.audioListener,
            },
        );

        abortSignal.throwIfAborted();

        if (!obj) {
            return null;
        }

        if (obj.animations.length > 1) {
            obj.animations.forEach((anim, index) => {
                anim.name = fileName + index;
            });
        } else if (obj.animations[0]) {
            obj.animations[0].name = fileName;
        }

        return obj.animations;
    });

    const results = await Promise.all(promises);
    const filteredResults: AnimationClip[] = results.filter(x => x !== null).flat();
    return filteredResults;
};
