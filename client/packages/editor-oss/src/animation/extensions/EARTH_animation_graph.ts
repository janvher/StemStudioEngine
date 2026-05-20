import {AnimationClip, Group} from "three";

import {AnimationGraph} from "../AnimationGraph";

export interface EARTHAnimationGraphExtensionData {
    base: {
        animationGraph: any;
    };
}

/**
 * EARTH_animation_graph glTF Extension
 *
 * This extension stores animation graph data in glTF files, allowing
 * complex animation state machines to be preserved and loaded.
 *
 * Extension name: EARTH_animation_graph
 * Extension version: 1.0
 */
export class EARTHAnimationGraphExtension {
    public static readonly EXTENSION_NAME = "EARTH_animation_graph";

    /**
     * Serialize animation graph data for glTF export
     * @param graph
     * @param clips
     */
    public static serialize(graph: AnimationGraph, clips: AnimationClip[]): EARTHAnimationGraphExtensionData {
        const graphData = graph.toJSON();

        return {
            base: {
                animationGraph: JSON.parse(graphData),
            },
        };
    }

    /**
     * Deserialize animation graph data from glTF import
     * @param data
     * @param clipMap
     */
    public static deserialize(
        data: EARTHAnimationGraphExtensionData,
        clipMap: Record<string, AnimationClip>,
    ): {graph: AnimationGraph; clips: AnimationClip[]} {
        const graph = new AnimationGraph(new Group());

        graph.fromJSON(JSON.stringify(data.base?.animationGraph ?? {}), clipMap);

        const clips = Object.values(clipMap);

        return {graph, clips};
    }

    /**
     * Validate extension data
     * @param data
     */
    public static validate(data: any): boolean {
        return !!(data && data.base && data.base.animationGraph);
    }
}
