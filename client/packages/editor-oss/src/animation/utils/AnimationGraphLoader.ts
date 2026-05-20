import {Object3D, AnimationClip} from "three";

import {AnimationGraph} from "../AnimationGraph";
import {EARTHAnimationGraphExtension} from "../extensions/EARTH_animation_graph";

// Define custom properties for extended Object3D
type ExtendedObject3D = Object3D & {
    _animationGraph?: AnimationGraph;
    _animationGraphClips?: AnimationClip[];
    _obj?: {
        animations?: AnimationClip[];
    };
    animations?: AnimationClip[];
};

/**
 * Utility class for loading animation graphs from loaded models
 */
export class AnimationGraphLoader {
    /**
     * Extract animation graph from a loaded model
     * @param model
     */
    public static extractAnimationGraph(model: Object3D): {
        graph: AnimationGraph | null;
        clips: AnimationClip[];
    } {
        const extendedModel = model as ExtendedObject3D;

        // Check if the model has animation graph data
        if (extendedModel._animationGraph && extendedModel._animationGraphClips) {
            return {
                graph: extendedModel._animationGraph,
                clips: extendedModel._animationGraphClips,
            };
        }

        // Check if the model has the EARTH_animation_graph extension in userData
        if (model.userData && model.userData.extensions && model.userData.extensions.EARTH_animation_graph) {
            const extensionData = model.userData.extensions.EARTH_animation_graph;

            // Create a clip map from the model's animations
            const clipMap: Record<string, AnimationClip> = {};
            const animations = extendedModel._obj?.animations || extendedModel.animations || [];
            animations.forEach((clip: AnimationClip) => {
                clipMap[clip.name] = clip;
            });

            // Deserialize the animation graph
            const {graph, clips} = EARTHAnimationGraphExtension.deserialize(extensionData, clipMap);

            return {graph, clips};
        }

        // No animation graph found
        return {
            graph: null,
            clips: extendedModel._obj?.animations || extendedModel.animations || [],
        };
    }

    /**
     * Check if a model has an animation graph
     * @param model
     */
    public static hasAnimationGraph(model: Object3D): boolean {
        const extendedModel = model as ExtendedObject3D;
        return !!(extendedModel._animationGraph || model.userData?.extensions?.EARTH_animation_graph);
    }

    /**
     * Get animation clips from a model
     * @param model
     */
    public static getAnimationClips(model: Object3D): AnimationClip[] {
        const extendedModel = model as ExtendedObject3D;
        return extendedModel._obj?.animations || extendedModel.animations || [];
    }
}
