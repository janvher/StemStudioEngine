/**
 * Module: BehaviorLoadingService.ts
 * Purpose: Consolidates behavior config loading and class resolution that was
 * previously duplicated between Editor and GameManager.
 */

import * as THREE from "three";

import {BehaviorConstructor} from "./Behavior";
import BehaviorClassConfig from "./BehaviorClassConfig";
import {BehaviorFileLoader} from "./BehaviorFileLoader";
import BehaviorScriptInjector from "./BehaviorScriptInjector";
import {isLegacyBehaviorId} from "./util";
import {AssetType, getAsset} from "@stem/network/api/asset";
import {
    getBehaviorBundle,
    getBehaviorsFromAssets,
    getBehaviorsFromScriptBundle,
    getBehaviorsListForScene,
    getImportResolutionContextFromScriptBundle,
    getImportRevisionMapFromScriptBundle,
} from "@stem/network/api/behavior";
import type {ScriptBundle} from "@stem/network/api/behavior";
import type {AssetLoader} from "@stem/editor-oss/asset-management/AssetLoader";
import {assetRefKey} from "@stem/editor-oss/asset-management/AssetRef";
import type {ReadonlyAssetResolutionContext} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import type {AssetSource} from "@stem/editor-oss/editor/asset-management/AssetSource";
import {BehaviorConfig} from "@stem/editor-oss/editor/behaviors/BehaviorConfig";
import {isSceneBehaviorsMigrated} from "@stem/editor-oss/editor/behaviors/LegacyBehaviorMigration";
import global from "../global";
import {loadScriptImportRevisionMap, type ScriptImportRevisionMap} from "../script-runtime/scriptImports";

const DEFAULT_BATCH_SIZE = 8;

type SceneConfigsResult = {configs: BehaviorClassConfig[]; scripts: Record<string, string>};

type BundleResult = Awaited<ReturnType<typeof getBehaviorsFromScriptBundle>>;

export class BehaviorLoadingService {
    private fileLoader: BehaviorFileLoader;
    private assetLoader: AssetLoader;
    private defaultConfigsCache: BehaviorConfig[] | null = null;
    private defaultConfigsLoading: Promise<BehaviorConfig[]> | null = null;
    private bundleLoading: Promise<BundleResult> | null = null;
    private scriptBundleLoading: Promise<ScriptBundle | null> | null = null;
    private scriptBundleCache: ScriptBundle | null = null;
    private sceneConfigsLoading: Promise<SceneConfigsResult> | null = null;
    private builtInIds: Set<string> = new Set();

    constructor(useEditorPath: boolean, assetLoader: AssetLoader) {
        this.fileLoader = new BehaviorFileLoader(useEditorPath);
        this.assetLoader = assetLoader;
    }

    /**
     * Set of behavior IDs that came from `packs/**​/behavior.json` files
     * (built-in pack behaviors shipped with the editor). Populated by
     * `loadDefaultConfigs()` at editor startup. Used by the save path to
     * skip serializing the full `BehaviorClassConfig` for built-ins —
     * only the `{id}` reference is written and the registry resolves the
     * rest on load.
     */
    getBuiltInIds(): ReadonlySet<string> {
        return this.builtInIds;
    }

    /**
     * Load default behavior configs from built-in packs (behavior.json files).
     * Results are cached so configs are fetched once per session.
     *
     * @returns All built-in behavior configs discovered via behavior.json files.
     */
    async loadDefaultConfigs(): Promise<BehaviorConfig[]> {
        if (this.defaultConfigsCache) {
            return this.defaultConfigsCache;
        }
        if (this.defaultConfigsLoading) {
            return this.defaultConfigsLoading;
        }

        this.defaultConfigsLoading = this.fetchDefaultConfigs();
        this.defaultConfigsCache = await this.defaultConfigsLoading;
        this.defaultConfigsLoading = null;
        return this.defaultConfigsCache;
    }

    private async fetchDefaultConfigs(): Promise<BehaviorConfig[]> {
        const modules = import.meta.glob("./packs/**/behavior.json");
        const configs: BehaviorConfig[] = [];
        for (const path in modules) {
            const module = await (modules[path] as () => Promise<{default: BehaviorConfig}>)();
            configs.push(module.default);
        }
        this.builtInIds = new Set(configs.map(c => c.id));
        return configs;
    }

    /**
     * Prefetch the behavior bundle for a published scene. Can be called
     * before scene deserialization so the network request overlaps with
     * other work. The result is consumed by loadSceneConfigs().
     *
     * Callers should seed AssetLoader with scene derivatives before calling
     * this so that the bundle URL can be resolved from cache.
     *
     * @param assetId - The scene's asset ID.
     * @param revisionId - The scene's head revision ID.
     */
    prefetchBehaviorBundle(assetId: string, revisionId: string): void {
        if (!this.scriptBundleLoading) {
            this.scriptBundleLoading = this.fetchScriptBundle(assetId, revisionId);
        }
        if (!this.bundleLoading) {
            this.bundleLoading = this.scriptBundleLoading.then(bundle => {
                this.scriptBundleCache = bundle;
                return getBehaviorsFromScriptBundle(bundle);
            });
        }
    }

    /**
     * Load scene-specific behavior configs and scripts from the backend API
     * and scene userData, handling legacy migration.
     *
     * If prefetchBehaviorBundle() was called earlier, its cached bundle is
     * used instead of starting a new fetch.
     *
     * @param scene - The deserialized scene. Must be called after scene
     *   deserialization so that scene.userData.behaviorConfigs is populated.
     * @param opts - Loading options.
     * @param opts.assetSource - Source for discovering behavior assets
     *   (scene-backed or stem-backed).
     * @param opts.assetId - The scene's asset ID (optional; enables bundle path).
     * @returns Merged behavior configs and scripts from both the backend and
     *   scene.userData.
     */
    async loadSceneConfigs(
        scene: THREE.Scene,
        opts: {assetSource?: AssetSource; assetId?: string},
    ): Promise<SceneConfigsResult> {
        if (!this.sceneConfigsLoading) {
            this.sceneConfigsLoading = this.doLoadSceneConfigs(scene, opts);
        }
        return this.sceneConfigsLoading;
    }

    /** Clear cached data (call between scene loads). */
    clearSceneConfigsCache(): void {
        this.bundleLoading = null;
        this.scriptBundleLoading = null;
        this.scriptBundleCache = null;
        this.sceneConfigsLoading = null;
    }

    async loadScriptBundle(assetId: string, revisionId?: string): Promise<ScriptBundle | null> {
        if (this.scriptBundleCache) {
            return this.scriptBundleCache;
        }

        if (!this.scriptBundleLoading) {
            this.scriptBundleLoading = this.fetchScriptBundle(assetId, revisionId);
        }

        this.scriptBundleCache = await this.scriptBundleLoading;
        return this.scriptBundleCache;
    }

    getBundledImportRevisionMap(): ScriptImportRevisionMap {
        return getImportRevisionMapFromScriptBundle(this.scriptBundleCache);
    }

    getBundledImportResolutionContext(): ReadonlyAssetResolutionContext {
        return getImportResolutionContextFromScriptBundle(this.scriptBundleCache);
    }

    /**
     * Batch-load behavior classes for a set of configs, handling both
     * file-based and script-based behaviors.
     *
     * @param configs - Behavior configs to load classes for.
     * @param scripts - Map of behavior ID to script source code.
     * @param scriptInjector - Optional injector for parsing script-based behaviors.
     * @returns Map of behavior ID to its loaded constructor.
     */
    async loadClasses(
        configs: BehaviorClassConfig[],
        scripts: Record<string, string>,
        scriptInjector?: BehaviorScriptInjector,
        options?: {
            context?: ReadonlyAssetResolutionContext;
            importRevisionMap?: ScriptImportRevisionMap;
        },
    ): Promise<Map<string, BehaviorConstructor>> {
        const loaded = new Map<string, BehaviorConstructor>();
        const fileBehaviors: BehaviorClassConfig[] = [];

        for (const config of configs) {
            if (loaded.has(config.id)) continue;

            if (config.isScript && scriptInjector) {
                const script = scripts[config.id];
                if (script) {
                    const importRevisionMap = await loadScriptImportRevisionMap(
                        script,
                        options?.context,
                        options?.importRevisionMap,
                    );
                    const cls = scriptInjector.parse(config.id, script, config.name, {
                        context: options?.context,
                        importRevisionMap,
                    });
                    if (cls) loaded.set(config.id, cls);
                }
            } else if (!config.isScript) {
                fileBehaviors.push(config);
            }
        }

        if (fileBehaviors.length > 0) {
            const paths = fileBehaviors.map(c => ({folder: c.id, main: c.main}));
            const classes = await this.fileLoader.loadBehaviorsBatch(paths, DEFAULT_BATCH_SIZE);

            for (let i = 0; i < classes.length; i++) {
                const cls = classes[i];
                const config = fileBehaviors[i];
                if (cls && config) {
                    loaded.set(config.id, cls);
                }
            }
        }

        return loaded;
    }

    /** Expose the file loader for callers that need direct access. */
    getFileLoader(): BehaviorFileLoader {
        return this.fileLoader;
    }

    private async doLoadSceneConfigs(
        scene: THREE.Scene,
        opts: {assetSource?: AssetSource; assetId?: string},
    ): Promise<SceneConfigsResult> {
        const {configs, scripts} = await this.loadBackendBehaviors(scene, opts);

        // Merge with scene.userData behaviors (must be called after deserialization)
        const {configs: sceneConfigs, scripts: sceneScripts} = this.loadSceneBehaviors(scene);

        const isMigrated = isSceneBehaviorsMigrated(scene);
        if (isMigrated) {
            const fileBasedConfigs = sceneConfigs.filter(config => !config.isScript);
            return {
                configs: [...fileBasedConfigs, ...configs],
                scripts,
            };
        }

        // Merge scene-based and API-based configs, preferring API ones
        const configIds = new Set(configs.map(config => config.id));
        for (const legacyConfig of sceneConfigs) {
            if (!configIds.has(legacyConfig.id)) {
                configs.push(legacyConfig);
            }
        }
        for (const [id, legacyScript] of Object.entries(sceneScripts)) {
            if (!configIds.has(id)) {
                scripts[id] = legacyScript;
            }
        }

        return {configs, scripts};
    }

    private async fetchScriptBundle(assetId: string, revisionId?: string): Promise<ScriptBundle | null> {
        const rev = revisionId ?? (await getAsset(assetId))?.headRevisionId;
        if (!rev) {
            return null;
        }
        const url = await this.assetLoader.getBehaviorBundleUrl({assetId, revisionId: rev});
        if (url) {
            return fetch(url)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null);
        }
        return getBehaviorBundle(assetId, rev);
    }

    private async loadBackendBehaviors(
        scene: THREE.Scene,
        opts: {assetSource?: AssetSource; assetId?: string},
    ): Promise<SceneConfigsResult> {
        const {assetSource, assetId} = opts;

        // Use prefetched bundle if available, otherwise fetch now
        let behaviors: BundleResult = null;
        if (this.bundleLoading) {
            behaviors = await this.bundleLoading;
        } else if (assetId) {
            const bundle = await this.loadScriptBundle(assetId);
            behaviors = getBehaviorsFromScriptBundle(bundle);
        }
        if (behaviors) {
            console.log(`[BehaviorLoadingService] Loaded ${behaviors.length} behaviors from bundle`);
        } else if (assetSource) {
            behaviors =
                assetSource.kind === "scene"
                    ? await getBehaviorsListForScene(assetSource.id, scene)
                    : await assetSource
                          .getAssets({types: [AssetType.Behavior]})
                          .then(({assets}) => getBehaviorsFromAssets(assets, scene));
        } else {
            // No assetSource and no prefetched bundle — play mode entered on
            // an unsaved / template / stem-ephemeral scene. Skip the backend
            // fetch; built-in packs (loadDefaultConfigs) + scene.userData
            // configs (loadSceneBehaviors) still cover gameplay.
            behaviors = [];
        }

        const filteredBehaviors = (behaviors ?? []).filter(behavior => !isLegacyBehaviorId(behavior.ID));

        const configs = filteredBehaviors.map(
            ({ID, RevisionID, Config}) =>
                ({
                    ...Config,
                    id: assetRefKey({assetId: ID, revisionId: RevisionID!}),
                }) as BehaviorClassConfig,
        );

        const scripts = filteredBehaviors.reduce(
            (acc, {ID, RevisionID, Code}) => {
                if (Code) {
                    const key = assetRefKey({assetId: ID, revisionId: RevisionID!});
                    acc[key] = Code;
                }
                return acc;
            },
            {} as Record<string, string>,
        );

        return {configs, scripts};
    }

    private loadSceneBehaviors(scene: THREE.Scene): {
        configs: BehaviorClassConfig[];
        scripts: Record<string, string>;
    } {
        const stored = (scene.userData.behaviorConfigs as Array<BehaviorClassConfig | {id: string}>) || [];
        const scripts = (scene.userData.scripts as Record<string, string>) || {};

        // Built-in pack behaviors are written as bare `{id}` references on
        // save (see Editor.saveLegacySceneBehaviorConfigs) to keep saved
        // scenes small. Resolve them here against the live
        // behaviorConfigRegistry. Legacy files that still carry the full
        // config flow through unchanged.
        const registry = global.app?.editor?.behaviorConfigRegistry;
        const configs: BehaviorClassConfig[] = [];
        for (const entry of stored) {
            if (!entry) continue;
            const hasFullConfig = typeof entry === "object" && "main" in entry && !!(entry as BehaviorClassConfig).main;
            if (hasFullConfig) {
                configs.push(entry as BehaviorClassConfig);
                continue;
            }
            const id = (entry as {id?: string}).id;
            if (!id) continue;
            const resolved = registry?.getConfig(id);
            if (resolved) {
                configs.push(resolved);
            } else {
                console.warn(
                    `[BehaviorLoadingService] unresolved behavior reference "${id}" — registry has no entry. ` +
                    `Keeping the stored entry; runtime resolution may fail.`,
                );
                configs.push(entry as BehaviorClassConfig);
            }
        }
        return {configs, scripts};
    }
}
