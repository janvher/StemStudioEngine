import * as UIKit from "@ni2khanna/uikit";
import {CSS3DObject, CSS3DSprite} from "three/examples/jsm/renderers/CSS3DRenderer.js";
import * as THREE from "three/webgpu";
import * as Quarks from "three.quarks";

import {Behavior, BehaviorBase, BehaviorConstructor, BehaviorOptions} from "./Behavior";
import EventBus from "./event/EventBus";
import GameManager from "./game/GameManager";
import UIKitPointerEvents from "./uikit/UIKitPointerEvents";
import type {ReadonlyAssetResolutionContext} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {CesiumTool} from "@stem/editor-oss/cesium/CesiumTool";
import {breakpointManager, injectDebuggerStatements} from "@stem/editor-oss/editor/assets/v2/BehaviorEditor/breakpoints";
import global from "@stem/editor-oss/global";
import {
    buildScriptImportAliases,
    parseScriptImports,
    type ScriptImportRevisionMap,
} from "../script-runtime/scriptImports";
import {removeDebuggerStatements, shouldFilterDebuggers} from "@stem/editor-oss/utils/DebuggerUtils";

import "ses";

/**
 *
 */
function isCompartmentsEnabled(): boolean {
    return global.app?.editor?.scene?.userData?.compartmentsEnabled ?? false;
}

const stripUnsupportedMaterialParameters = <T,>(parameters: T, unsupportedKeys: string[]): T => {
    if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
        return parameters;
    }

    const source = parameters as Record<string, unknown>;
    let next: Record<string, unknown> | null = null;
    for (const key of unsupportedKeys) {
        if (key in source) {
            next = next ? next : {...source};
            delete next[key];
        }
    }

    return (next || parameters) as T;
};

class RuntimeMeshPhysicalNodeMaterial extends THREE.MeshPhysicalNodeMaterial {
    constructor(parameters?: any) {
        super(stripUnsupportedMaterialParameters(parameters, ["reflectivity"]));
    }
}

const RuntimeTHREE = {
    ...THREE,
    MeshPhysicalNodeMaterial: RuntimeMeshPhysicalNodeMaterial,
};

class BehaviorScriptInjector {
    constructor() {}
    parse(
        scriptName: string,
        scriptString: string,
        displayName?: string,
        options?: {
            context?: ReadonlyAssetResolutionContext;
            importRevisionMap?: ScriptImportRevisionMap;
        },
    ): BehaviorConstructor {
        // Check if production mode is enabled and filter debugger statements
        const productionMode = global.app?.editor?.scene?.userData?.productionMode;
        if (shouldFilterDebuggers({productionMode})) {
            scriptString = removeDebuggerStatements(scriptString);
        }

        // Inject debugger statements at breakpoint lines
        const breakpoints = breakpointManager.get(`${scriptName}-code`);
        if (breakpoints.size > 0) {
            scriptString = injectDebuggerStatements(scriptString, breakpoints);
        }

        const parsedScript = parseScriptImports(scriptString);
        if (parsedScript.errors.length > 0) {
            throw new Error(parsedScript.errors[0]!.message);
        }

        const buildImportAliases = (runtimeEndowments: Record<string, unknown>) =>
            buildScriptImportAliases({
                source: scriptString,
                context: options?.context,
                importRevisionMap: options?.importRevisionMap,
                runtimeEndowments,
                useCompartment: isCompartmentsEnabled(),
            });

        if (!isCompartmentsEnabled()) {
            return class ScriptBehavior extends BehaviorBase {
                constructor(target: THREE.Object3D, id: string, options: BehaviorOptions) {
                    super(target, id, options);

                    try {
                        const baseEndowments = {
                            THREE: RuntimeTHREE,
                            CSS3DObject,
                            CSS3DSprite,
                            UIKit,
                            UIKitPointerEvents,
                            CesiumTool,
                            EventBus,
                            // three.quarks — see compartment-mode comment below for usage
                            Quarks,
                            ParticleEmitter: Quarks.ParticleEmitter,
                            ParticleSystem: Quarks.ParticleSystem,
                            BatchedRenderer: Quarks.BatchedRenderer,
                            QuarksUtil: Quarks.QuarksUtil,
                            SphereEmitter: Quarks.SphereEmitter,
                            ConeEmitter: Quarks.ConeEmitter,
                            DonutEmitter: Quarks.DonutEmitter,
                        };
                        const importAliases = buildImportAliases(baseEndowments);
                        const argNames = [...Object.keys(baseEndowments), ...Object.keys(importAliases)];
                        const argValues = [...Object.values(baseEndowments), ...Object.values(importAliases)];
                        // eslint-disable-next-line @typescript-eslint/no-implied-eval -- intentional: behavior scripts run via Function with endowments as named args
                        new Function(
                            ...argNames,
                            `
                            with (this) {
                                ${parsedScript.code}
                            }
                            //# sourceURL=behavior://${scriptName}
                            `,
                        ).call(this, ...argValues);
                    } catch (error) {
                        console.error(`Initialisation error in ${scriptName}/${displayName}:`, error);
                    }
                }
            };
        }

        return class ScriptBehavior extends BehaviorBase {
            private compartment: Compartment | null = null;
            private script: Partial<Behavior> = {};
            private scriptFactory: (() => Partial<Behavior>) | null = null;

            constructor(target: THREE.Object3D, id: string, options: BehaviorOptions) {
                super(target, id, options);
            }

            private initializeCompartment() {
                if (this.compartment) {
                    return;
                }

                try {
                    const baseEndowments = {
                        //TODO - remove access to full threejs
                        THREE: RuntimeTHREE,
                        EventBus, // @deprecated — use onEvent() and game.behaviorManager.sendEventToObjectBehaviors() instead
                        CSS3DObject,
                        CSS3DSprite,
                        UIKit,
                        UIKitPointerEvents,
                        CesiumTool,
                        // three.quarks particle system — exposed so behaviors can construct
                        // ParticleEmitter / ParticleSystem and emitter shape classes
                        // (SphereEmitter, ConeEmitter, DonutEmitter, etc.) at runtime.
                        // Attach the resulting ParticleEmitter to the scene/gameObject and
                        // register its `system` with the engine's shared BatchedRenderer
                        // (located via `game.scene.getObjectByProperty("type", "BatchedRenderer")`
                        // — the engine names it `"BatchedRenderer"` in EngineRuntime.ts).
                        // The renderer ticks every frame; un-register on dispose with
                        // `batchedRenderer.deleteSystem(emitter.system)`. See
                        // docs/domains/three-quarks-api-reference.md and existing behavior
                        // MP-Garden-Party-v1.31.01.002-4/behaviors/EffectPool-2.yaml for the
                        // canonical add/delete pattern.
                        Quarks,
                        ParticleEmitter: Quarks.ParticleEmitter,
                        ParticleSystem: Quarks.ParticleSystem,
                        BatchedRenderer: Quarks.BatchedRenderer,
                        QuarksUtil: Quarks.QuarksUtil,
                        SphereEmitter: Quarks.SphereEmitter,
                        ConeEmitter: Quarks.ConeEmitter,
                        DonutEmitter: Quarks.DonutEmitter,
                        console: {
                            log: (...args: any[]) => console.log(...args),
                            error: (...args: any[]) => console.error(...args),
                            warn: (...args: any[]) => console.warn(...args),
                            info: (...args: any[]) => console.info(...args),
                            debug: (...args: any[]) => console.debug(...args),
                        },
                        document,
                        window, // host window — exposed for legacy DOM access (addEventListener, innerWidth, etc.). Prefer `this.erth.*`, `game.renderer.domElement`, or `document`.
                        performance, // host performance — Date.now() is already available via Compartment base globals
                        requestAnimationFrame: window.requestAnimationFrame.bind(window),
                        cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
                        setTimeout: window.setTimeout.bind(window),
                        clearTimeout: window.clearTimeout.bind(window),
                        setInterval: window.setInterval.bind(window),
                        clearInterval: window.clearInterval.bind(window),
                        // DOM audio constructors — commonly needed for one-shot sound playback
                        Audio: window.Audio,
                        AudioContext: window.AudioContext,
                        Image: window.Image,
                        // Fetch & URL — commonly needed for proxy calls and asset URL handling
                        fetch: window.fetch.bind(window),
                        URL: window.URL,
                        URLSearchParams: window.URLSearchParams,
                        eval: undefined,
                        harden: undefined,
                        lockdown: undefined,
                    };

                    const importAliases = buildImportAliases(baseEndowments);
                    const endowments = {
                        ...baseEndowments,
                        ...importAliases,
                    };

                    this.compartment = new Compartment(endowments);

                    // Apply debugger filtering for compartment mode as well
                    const productionMode = global.app?.editor?.scene?.userData?.productionMode;
                    const filteredScriptString = shouldFilterDebuggers({productionMode})
                        ? removeDebuggerStatements(parsedScript.code)
                        : parsedScript.code;

                    const wrapperCode = `
                    (function() {
                        return function() {
                            const behavior = {
                                target: undefined,
                                erth: undefined,
                                gameObject: undefined,
                                attributes: this.attributes,
                                id: undefined,
                                uuid: undefined,
                                type: this.type,
                                isPaused: this.isPaused,
                                throttleConfig: undefined,
                                getAttribute: undefined,
                                requestAttributeChange: undefined,
                                findBehavior: undefined,
                                findBehaviors: undefined,
                                init: undefined,
                                dispose: undefined,
                                update: undefined,
                                fixedUpdate: undefined,
                                onStart: undefined,
                                onStop: undefined,
                                onPaused: undefined,
                                onResumed: undefined,
                                onReset: undefined,
                                onEvent: undefined,
                                onAttributesUpdated: undefined,
                                onWorkerMessage: undefined,
                                getWorkerInitData: undefined,
                                onStateUpdated: undefined,
                                onAttributeChangeRequested: undefined,
                                onAttributeChanged: undefined,
                            };

                            (function() {
                                ${filteredScriptString}
                            }).call(behavior);

                            return behavior;
                        };
                    })()
                    //# sourceURL=behavior://${scriptName}
                    `;

                    this.scriptFactory = this.compartment.evaluate(wrapperCode);
                    if (this.scriptFactory) {
                        this.script = this.scriptFactory();
                    }
                } catch (error) {
                    console.error(`Initialisation error in ${scriptName}/${displayName}:`, error);
                    this.compartment = null;
                    this.script = {};
                }
            }

            init(game: GameManager): void {
                try {
                    this.initializeCompartment();
                    this.updateScript();
                    if (this.script.init) {
                        // Behavior init may return a Promise (async init); we don't
                        // await — the runtime drives lifecycle via separate hooks.
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        this.script.init(game);
                    }
                } catch (error) {
                    console.error(`Error in "${scriptName}/${displayName}" script init:`, error);
                }
            }

            update(deltaTime: number): void {
                try {
                    (this.script.target as any) = this.target;
                    (this.script as any).isPaused = this.isPaused;
                    if (this.script.update) {
                        const result: any = this.script.update(deltaTime);
                        if (result instanceof Promise) {
                            void result.catch(error => {
                                console.error(`Error in "${scriptName}/${displayName}" script update:`, error);
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error in "${scriptName}/${displayName}" script update:`, error);
                }
            }

            onStart(): void {
                try {
                    this.updateScript();

                    if (this.script.onStart) {
                        const result = this.script.onStart();
                        if (result instanceof Promise) {
                            void result.catch(error => {
                                console.error(`Error in "${scriptName}/${displayName}" script onStart:`, error);
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error in "${scriptName}/${displayName}" script onStart:`, error);
                }
            }

            onStop(): void {
                try {
                    this.updateScript();

                    if (this.script.onStop) {
                        this.script.onStop();
                    }
                } catch (error) {
                    console.error(`Error in "${scriptName}/${displayName}" script onStop:`, error);
                }
            }

            onReset(): void {
                try {
                    this.updateScript();

                    if (this.script.onReset) {
                        this.script.onReset();
                    }
                } catch (error) {
                    console.error(`Error in "${scriptName}/${displayName}" script onReset:`, error);
                }
            }

            dispose(): void {
                try {
                    if (this.script.dispose) {
                        this.script.dispose();
                    }
                } catch (error) {
                    console.error(`Error in "${scriptName}/${displayName}" script dispose:`, error);
                }
            }

            onEvent(msg: string, data: any): void | Promise<void> | Generator {
                try {
                    if (this.script.onEvent) {
                        const result: any = this.script.onEvent(msg, data);
                        if (result instanceof Promise) {
                            void result.catch(error => {
                                console.error(`Error in "${scriptName}/${displayName}" script onEvent:`, error);
                            });
                        }
                        return result;
                    }
                } catch (error) {
                    console.error(`Error in "${scriptName}/${displayName}" script onEvent:`, error);
                }
            }

            onAttributesUpdated(): void {
                try {
                    this.updateScript();

                    if (this.script.onAttributesUpdated) {
                        this.script.onAttributesUpdated();
                    }
                } catch (error) {
                    console.error(`Error in "${scriptName}/${displayName}" script onAttributesUpdated:`, error);
                }
            }

            fixedUpdate(fixedDeltaTime: number): void {
                try {
                    if (this.script.fixedUpdate) {
                        this.script.fixedUpdate(fixedDeltaTime);
                    }
                } catch (error) {
                    console.error(`Error in "${scriptName}/${displayName}" script fixedUpdate:`, error);
                }
            }

            onStateUpdated(key: string, value: string | undefined): void {
                try {
                    this.updateScript();

                    if (this.script.onStateUpdated) {
                        this.script.onStateUpdated(key, value);
                    }
                } catch (error) {
                    console.error(`Error in "${scriptName}/${displayName}" script onStateUpdated:`, error);
                }
            }

            onAttributeChangeRequested(key: string, newValue: any, oldValue: any, requester: any): boolean {
                try {
                    if (this.script.onAttributeChangeRequested) {
                        return this.script.onAttributeChangeRequested(key, newValue, oldValue, requester) ?? true;
                    }
                } catch (error) {
                    console.error(`Error in "${scriptName}/${displayName}" script onAttributeChangeRequested:`, error);
                }
                return true;
            }

            onAttributeChanged(key: string, newValue: any, oldValue: any): void {
                try {
                    if (this.script.onAttributeChanged) {
                        this.script.onAttributeChanged(key, newValue, oldValue);
                    }
                } catch (error) {
                    console.error(`Error in "${scriptName}/${displayName}" script onAttributeChanged:`, error);
                }
            }

            private updateScript() {
                (this.script.target as any) = this.target;
                (this.script.attributes as any) = this.attributes;
                (this.script as any).erth = this.erth;
                (this.script as any).gameObject = this.gameObject;
                (this.script as any).id = this.id;
                (this.script as any).uuid = this.uuid;
                (this.script as any).isPaused = this.isPaused;
                (this.script as any).throttleConfig = this.throttleConfig;
                (this.script as any).getAttribute = (key: string) => this.getAttribute(key);
                (this.script as any).requestAttributeChange = (key: string, value: any, options?: any) => this.requestAttributeChange(key, value, options);
                (this.script as any).findBehavior = (id: string, target?: THREE.Object3D) => this.findBehavior(id, target);
                (this.script as any).findBehaviors = (id: string) => this.findBehaviors(id);
            }
        };
    }
}

export default BehaviorScriptInjector;
