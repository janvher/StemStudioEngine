import {AnimationClip, Group} from "three";

import {AnimationGraph} from "../AnimationGraph";
import {AnimationState} from "../AnimationState";
import {EARTHAnimationGraphExtension} from "./EARTH_animation_graph";

/**
 * Simple test for the EARTH_animation_graph extension
 */
export function testEARTHAnimationGraphExtension() {
    console.log("Testing EARTH_animation_graph extension...");

    const root = new Group();
    const graph = new AnimationGraph(root);

    const idleClip = new AnimationClip("idle", 1.0, []);
    const walkClip = new AnimationClip("walk", 1.0, []);
    const runClip = new AnimationClip("run", 1.0, []);

    const idleState = new AnimationState("idle", "Idle", idleClip);
    const walkState = new AnimationState("walk", "Walk", walkClip);
    const runState = new AnimationState("run", "Run", runClip);

    graph.addState(idleState);
    graph.addState(walkState);
    graph.addState(runState);

    graph.addParameter("speed", "float", 0);
    graph.addParameter("isMoving", "bool", false);

    graph.addTransition("idle", "walk", [{parameter: "speed", operator: "greater", value: 0.1}]);
    graph.addTransition("walk", "run", [{parameter: "speed", operator: "greater", value: 0.5}]);
    graph.addTransition("run", "walk", [{parameter: "speed", operator: "lessOrEqual", value: 0.5}]);
    graph.addTransition("walk", "idle", [{parameter: "speed", operator: "lessOrEqual", value: 0.1}]);

    graph.setState("idle");

    const clips = [idleClip, walkClip, runClip];

    console.log("Testing serialization...");
    const extensionData = EARTHAnimationGraphExtension.serialize(graph, clips);
    console.log("Extension data:", extensionData);

    console.log("Testing validation...");
    const isValid = EARTHAnimationGraphExtension.validate(extensionData);
    console.log("Extension data is valid:", isValid);

    console.log("Testing deserialization...");
    const clipMap: Record<string, AnimationClip> = {};
    clips.forEach(clip => {
        clipMap[clip.name] = clip;
    });

    const {graph: loadedGraph, clips: loadedClips} = EARTHAnimationGraphExtension.deserialize(extensionData, clipMap);
    console.log(
        "Loaded graph states:",
        loadedGraph.getStates().map(s => s.name),
    );
    console.log("Loaded graph parameters:", Array.from(loadedGraph.getParameters().keys()));
    console.log(
        "Loaded clips:",
        loadedClips.map(c => c.name),
    );

    const originalStates = graph
        .getStates()
        .map(s => s.name)
        .sort();
    const loadedStates = loadedGraph
        .getStates()
        .map(s => s.name)
        .sort();
    const statesMatch = JSON.stringify(originalStates) === JSON.stringify(loadedStates);

    const originalParams = Array.from(graph.getParameters().keys()).sort();
    const loadedParams = Array.from(loadedGraph.getParameters().keys()).sort();
    const paramsMatch = JSON.stringify(originalParams) === JSON.stringify(loadedParams);

    console.log("States match:", statesMatch);
    console.log("Parameters match:", paramsMatch);

    if (statesMatch && paramsMatch) {
        console.log("✅ EARTH_animation_graph extension test PASSED");
    } else {
        console.log("❌ EARTH_animation_graph extension test FAILED");
    }

    return {statesMatch, paramsMatch};
}
