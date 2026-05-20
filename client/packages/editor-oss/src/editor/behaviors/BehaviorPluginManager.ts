import {Object3D} from "three";

import {isAssetRef} from "@stem/editor-oss/asset-management/AssetRef";
import {Behavior} from "../../behaviors/Behavior";
import BehaviorData from "../../behaviors/BehaviorData";
import {BehaviorWorkerBridge} from "../../behaviors/worker/BehaviorWorkerBridge";
import Editor from "../Editor";

class BehaviorPluginManager {
    private behaviorPlugins: Map<string, Behavior> = new Map();
    private activePlugins: Behavior[] = [];
    private editor: Editor;

    /** Throttle interval for onEditorUpdate callbacks (1 FPS). */
    private static readonly UPDATE_INTERVAL = 1;
    private timeSinceLastUpdate = 0;

    constructor(editor: Editor) {
        this.editor = editor;
    }

    addPlugin(target: Object3D, plugin: Behavior) {
        if (this.behaviorPlugins.has(plugin.uuid)) {
            console.error(
                `[BehaviorPluginManager] Behavior Plugin "${plugin.id}" with uuid "${plugin.uuid}" is already added.`,
            );
            return;
        }

        this.behaviorPlugins.set(plugin.uuid, plugin);
        console.info(
            `[BehaviorPluginManager] Behavior Plugin "${plugin.id}" added successfully with uuid "${plugin.uuid}".`,
        );

        this.handlePluginAddition(target, plugin);
    }

    getPlugin(uuid: string): Behavior | null {
        return this.behaviorPlugins.get(uuid) || null;
    }

    removePlugin(plugin: Behavior) {
        const uuid = plugin.uuid;

        if (this.behaviorPlugins.has(uuid)) {
            this.behaviorPlugins.delete(uuid);

            this.handlePluginRemoval(plugin);

            console.info(
                `[BehaviorPluginManager] Behavior Plugin "${plugin.id}" with uuid "${uuid}" removed successfully.`,
            );
        } else {
            console.error(
                `[BehaviorPluginManager] Cannot remove Behavior Plugin "${plugin.id}" with uuid "${uuid}", it is not added.`,
            );
        }
    }

    isPlugin(plugin: Behavior): boolean {
        return !!(
            plugin.onEditorAdded ||
            plugin.onEditorRemoved ||
            plugin.onEditorDispose ||
            plugin.onEditorUpdate ||
            plugin.onEditorAttributesUpdated ||
            plugin.onEditorPanelShown ||
            plugin.onEditorPanelHidden ||
            plugin.onEditorEvent
        );
    }

    update(deltaTime: number) {
        this.timeSinceLastUpdate += deltaTime;
        if (this.timeSinceLastUpdate < BehaviorPluginManager.UPDATE_INTERVAL) {
            return;
        }
        this.timeSinceLastUpdate = 0;

        this.activePlugins.forEach(plugin => {
            try {
                plugin.onEditorUpdate?.();
            } catch (error) {
                console.error(`[BehaviorPluginManager] Error in onEditorUpdate for plugin "${plugin.id}":`, error);
            }
        });
    }

    clear() {
        const pluginsToRemove = [...this.behaviorPlugins.values()];
        this.behaviorPlugins.clear();
        pluginsToRemove.forEach(plugin => {
            plugin._workerBridge?.sendStop();
            try {
                plugin.onEditorDispose?.();
            } catch (error) {
                console.error(`[BehaviorPluginManager] Error in onEditorDispose for plugin "${plugin.id}":`, error);
            } finally {
                plugin._workerBridge?.dispose();
            }
        });
        this.activePlugins = [];
    }

    /**
     * Notify editor plugins whose behavior attributes reference the given asset.
     * Should be called after the scene's AssetResolutionContext has been updated
     * and AssetRef values have been re-resolved.
     *
     * @param scene - The scene root to traverse.
     * @param assetId - The asset ID whose revision changed.
     */
    updateAssetRefs(scene: Object3D, assetId: string): void {
        scene.traverse(object => {
            const behaviors = object.userData?.behaviors as BehaviorData[] | undefined;
            if (!behaviors) return;

            let objectAffected = false;

            for (const behavior of behaviors) {
                if (!behavior.attributesData || !this.behaviorReferencesAsset(behavior, assetId)) {
                    continue;
                }

                objectAffected = true;

                const plugin = this.getPlugin(behavior.uuid);
                if (plugin) {
                    try {
                        (plugin as any).attributes = behavior.attributesData;
                        plugin.onEditorAttributesUpdated?.();
                    } catch (error) {
                        console.error(
                            `[BehaviorPluginManager] Error in onEditorAttributesUpdated for plugin "${plugin.id}":`,
                            error,
                        );
                    }
                }
            }

            if (objectAffected) {
                this.editor.engine?.call("objectChanged", this.editor, object);
            }
        });
    }

    /**
     * Check whether a behavior's attributes contain any AssetRef that
     * references the given asset ID.
     *
     * @param behavior - The behavior data to inspect.
     * @param assetId - The asset ID to search for.
     * @returns True if any attribute references the asset.
     */
    private behaviorReferencesAsset(behavior: BehaviorData, assetId: string): boolean {
        if (!behavior.attributesData) return false;

        const check = (value: unknown): boolean => {
            if (isAssetRef(value)) {
                return (value).assetId === assetId;
            }
            if (Array.isArray(value)) {
                return value.some(check);
            }
            if (value && typeof value === "object") {
                return Object.values(value).some(check);
            }
            return false;
        };

        return Object.values(behavior.attributesData).some(check);
    }

    private handlePluginAddition(target: Object3D, plugin: Behavior) {
        (plugin as any).target = target;

        try {
            plugin.onEditorAdded?.(this.editor);
        } catch (error) {
            console.error(`[BehaviorPluginManager] Error in onEditorAdded for plugin "${plugin.id}":`, error);
        }

        this.initPluginWorker(plugin);

        if (plugin.onEditorUpdate || plugin.onEditorAdded) {
            this.activePlugins.push(plugin);
        }
    }

    private handlePluginRemoval(plugin: Behavior) {
        const index = this.activePlugins.indexOf(plugin);
        if (index !== -1) {
            this.activePlugins.splice(index, 1);
        }

        try {
            plugin._workerBridge?.sendStop();
            plugin.onEditorRemoved?.();
        } catch (error) {
            console.error(`[BehaviorPluginManager] Error in onEditorRemoved for plugin "${plugin.id}":`, error);
        } finally {
            plugin._workerBridge?.dispose();
        }

        (plugin as any).target = null;
    }

    private initPluginWorker(plugin: Behavior): void {
        if (!plugin.workerClass) return;
        const bridge = new BehaviorWorkerBridge(plugin, plugin.id);
        try {
            if (!bridge.init(plugin.workerClass)) {
                return;
            }
            plugin._workerBridge = bridge;
            bridge.sendInit(plugin.getWorkerInitData?.("editor") ?? {runtime: "editor"});
            bridge.sendStart();
        } catch (error) {
            console.error(`[BehaviorPluginManager] Error initializing worker for plugin "${plugin.id}":`, error);
            bridge.dispose();
        }
    }
}

export default BehaviorPluginManager;
