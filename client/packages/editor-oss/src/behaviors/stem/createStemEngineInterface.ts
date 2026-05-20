import { createForeignBehaviorView, unwrapBehavior } from "../Behavior";
import { createAIInterface } from './ai/createAIInterface';
import { createAssetInterface } from './asset/createAssetInterface';
import { createBehaviorTreeInterface } from './behaviorTree/createBehaviorTreeInterface';
import { createCameraInterface } from './camera/createCameraInterface';
import { createCombatInterface } from './combat/createCombatInterface';
import {
    StemEngineInterface,
    StemLambdas,
    StemBehaviors,
} from "./StemEngineInterface";
import { createEventsInterface } from './events/createEventsInterface';
import { createFsmInterface } from './fsm/createFsmInterface';
import { createObjectInterface } from './object/createObjectInterface';
import { createPoolInterface } from './pool/createPoolInterface';
import { createSceneInterface } from './scene/createSceneInterface';
import { createSpatialInterface } from './spatial/createSpatialInterface';
import { createStoreInterface } from './store/createStoreInterface';
import { GlobalStore } from './store/GlobalStore';
import { createTeamInterface } from './team/createTeamInterface';
import { createTweenInterface } from './tween/createTweenInterface';
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import { createForeignLambdaView } from "../../lambdas/Lambda";
import GameManager from "../game/GameManager";

const createLambdasInterface = (game: GameManager): StemLambdas => {
    return {
        getInstance: (instanceId: string) => {
            const lambda = game.lambdaManager?.getInstance(instanceId) ?? null;
            return lambda ? createForeignLambdaView(lambda) : null;
        },
        getInstancesByType: (lambdaId: string) =>
            (game.lambdaManager?.getInstancesByType(lambdaId) ?? []).map(lambda => createForeignLambdaView(lambda)),
        registerObject: (instanceId: string, target, componentData?) =>
            game.lambdaManager?.registerObject(instanceId, target, componentData) ?? false,
        deregisterObject: (instanceId: string, target) =>
            game.lambdaManager?.deregisterObject(instanceId, target),
        getObjectLambdas: (target) =>
            (game.lambdaManager?.getObjectLambdas(target) ?? []).map(lambda => createForeignLambdaView(lambda)),
    };
};

const createBehaviorsInterface = (game: GameManager): StemBehaviors => {
    return {
        find: (target, id) => {
            const results = game.behaviorManager?.getTargetBehaviorsById(target, id) ?? [];
            return results[0] ? createForeignBehaviorView(results[0]) : null;
        },
        findAll: (id) => (game.behaviorManager?.getBehaviorsById(id) ?? []).map(behavior => createForeignBehaviorView(behavior)),
        findOnObject: (target) =>
            (game.behaviorManager?.getTargetBehaviors(target) ?? []).map(behavior => createForeignBehaviorView(behavior)),
        getAttribute: (behavior, key) => behavior.getAttribute(key),
        requestChange: (behavior, key, value, options) =>
            game.behaviorManager!.requestAttributeChange(unwrapBehavior(behavior), key, value, null, options),
    };
};

export const createStemEngineInterface = (game: GameManager, globalStore: GlobalStore): StemEngineInterface => {
    const {erth: tween, groupRef: tweenGroupRef} = createTweenInterface();
    game.tweenGroupRef = tweenGroupRef;
    return {
        ai: createAIInterface(game),
        asset: createAssetInterface(game.engine, game),
        camera: createCameraInterface(game),
        combat: createCombatInterface(),
        team: createTeamInterface(),
        pool: createPoolInterface(),
        object: createObjectInterface(game),
        scene: createSceneInterface(game),
        store: createStoreInterface(globalStore),
        lambdas: createLambdasInterface(game),
        behaviors: createBehaviorsInterface(game),
        tween,
        fsm: createFsmInterface(),
        behaviorTree: createBehaviorTreeInterface(),
        spatial: createSpatialInterface(),
        events: createEventsInterface(),
    };
};

const notAvailable = (name: string) => {
    throw new Error(`erth.${name} is not available in edit mode`);
};

export const createEditorErthInterface = (engine: EngineRuntime): StemEngineInterface => {
    return {
        asset: createAssetInterface(engine),
        combat: createCombatInterface(),
        team: createTeamInterface(),
        pool: createPoolInterface(),
        store: createStoreInterface(new GlobalStore()),
        ai: { generate: () => notAvailable('ai') } as any,
        camera: { setTarget: () => notAvailable('camera'), getPosition: () => notAvailable('camera') } as any,
        object: { create: () => notAvailable('object'), destroy: () => notAvailable('object') } as any,
        scene: { getObjects: () => notAvailable('scene') } as any,
        lambdas: { getInstance: () => notAvailable('lambdas') } as any,
        behaviors: { find: () => notAvailable('behaviors') } as any,
        tween: {
            to: () => notAvailable('tween'),
            killAll: () => notAvailable('tween'),
        },
        fsm: { create: () => notAvailable('fsm') },
        behaviorTree: { create: () => notAvailable('behaviorTree') },
        spatial: { octree: () => notAvailable('spatial') },
        events: { on: () => notAvailable('events') },
    };
};
