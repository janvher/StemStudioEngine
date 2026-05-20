/**
 * Module: SceneConfig.ts
 * Purpose: Holds scene metadata fields that were previously scattered across Editor.
 * Application writes these values when loading a scene; GameManager and other
 * subsystems read them without needing a reference to Editor.
 */

import type {DomainSceneDto} from "@stem/network/api/client/api";
import {renderingApiToEditor} from "@stem/network/api/scene";
import {defaultRendering} from "../editor/defaultRendering";
import {HUDRendererMode, RenderingSettings} from "../types/GameSettingsTypes";

export class SceneConfig {
    sceneID: string | null = null;
    sceneName: string | null = null;
    sceneAlias: string | null = null;
    isPublic: boolean = false;
    isAssetPack: boolean = false;
    isTopPick: boolean = false;
    isCloneable: boolean = false;
    isPublished: boolean = false;
    projectUserId: string = "";
    useAvatar: boolean = false;
    isMultiplayer: boolean = false;
    multiplayerAutoJoin: boolean = true;
    maxMultiplayerClientsPerRoom: number = 4;
    isSandbox: boolean = false;
    isCollaborative: boolean = false;
    /**
     * True for scenes created via the dashboard AI prompt flow. When true,
     * AppGlobalContext defaults the project to advancedMode=false unless the
     * user has already saved an explicit per-project advanced-mode preference.
     * Flipping advancedMode back to true via the AppMenu clears this flag on
     * the server and locally.
     */
    aiPromptMode: boolean = false;
    maxCollaboratorsInRoom: number = 6;
    showHUD: boolean = false;
    hudRenderer: HUDRendererMode = "html";
    showStats: boolean = false;
    showMemoryStats: boolean = false;
    useInstancing: boolean = true;
    useShadows: boolean = true;
    rendering: RenderingSettings = defaultRendering;
    voiceChatEnabled: boolean = false;
    VFXOnMobile: boolean = false;
    majorVersion: number = 1;
    minorVersion: number = 0;
    assetsCount: number = 0;
    description: string = "";
    tags: string[] = [];
    contentRating: string = "Unrated";
    sceneLockedItems: string[] = [];
    sceneThumbnail: string | null = null;
    sceneAssetId: string | null = null;
    /**
     * The asset revision id currently loaded in the editor. Updated on load
     * and after every save. Compared against `publishRevisionId` to detect
     * when the editor has unpublished changes.
     */
    sceneRevisionId: string | null = null;
    /**
     * The asset revision id pinned as the publicly playable revision.
     * Empty when the scene has not been published via the new flow (it may
     * still be published via the legacy `isPublished` flag).
     */
    publishRevisionId: string = "";
    allowAnonymousFirebase: boolean = false;

    /**
     * Reset all fields to their defaults — mirrors the clearing logic
     * previously in Application.clearScene().
     */
    clear(): void {
        this.sceneID = null;
        this.sceneName = "Untitled Scene";
        this.sceneAlias = "";
        this.sceneLockedItems = [];
        this.sceneThumbnail = null;
        this.isCloneable = false;
        this.isPublic = false;
        this.isAssetPack = false;
        this.isTopPick = false;
        this.isPublished = false;
        this.useAvatar = false;
        this.isMultiplayer = false;
        this.multiplayerAutoJoin = true;
        this.maxMultiplayerClientsPerRoom = 4;
        this.isSandbox = false;
        this.isCollaborative = false;
        this.aiPromptMode = false;
        this.maxCollaboratorsInRoom = 6;
        this.showHUD = false;
        this.hudRenderer = "html";
        this.showStats = false;
        this.showMemoryStats = false;
        this.useInstancing = false;
        this.voiceChatEnabled = false;
        this.allowAnonymousFirebase = false;
        this.rendering = defaultRendering;
        this.projectUserId = "";
        this.description = "";
        this.tags = [];
        this.sceneAssetId = null;
        this.sceneRevisionId = null;
        this.publishRevisionId = "";
        this.contentRating = "Unrated";
    }

    /**
     * Populate fields from a v2 scene API response.
     * @param scene
     */
    loadFromMetadata(scene: DomainSceneDto): void {
        const meta = scene.asset.revision.metadata;
        // Scene-level fields
        this.sceneID = scene.id ?? null;
        this.sceneName = scene.name || "Untitled Scene";
        this.sceneAlias = scene.alias ?? null;
        this.sceneThumbnail = scene.thumbnail ?? null;
        this.isCloneable = scene.isCloneable ?? false;
        this.isPublic = scene.isPublic ?? false;
        this.isAssetPack = scene.isAssetPack ?? false;
        this.isTopPick = scene.isTopPick ?? false;
        this.isPublished = scene.isPublished ?? false;
        this.allowAnonymousFirebase = scene.allowAnonymousFirebase ?? false;
        this.isSandbox = scene.isSandbox ?? false;
        this.isCollaborative = scene.isCollaborative ?? false;
        this.aiPromptMode = scene.aiPromptMode ?? false;
        this.projectUserId = scene.userId ?? "";
        this.description = scene.description ?? "";
        this.tags = scene.tags ? JSON.parse(scene.tags) : [];
        this.contentRating = scene.contentRating || "Unrated";
        this.majorVersion = scene.majorVersion ?? 1;
        this.minorVersion = scene.minorVersion ?? 0;
        this.assetsCount = scene.assetsCount ?? 0;
        this.sceneAssetId = scene.asset.id;
        this.sceneRevisionId = scene.asset.revision.id;
        this.publishRevisionId = scene.publishRevisionId ?? "";
        // Revision metadata
        this.sceneLockedItems = meta.lockedItems ? meta.lockedItems.split(",") : [];
        this.VFXOnMobile = meta.vfxOnMobile ?? false;
        this.useAvatar = meta.useAvatar ?? false;
        this.isMultiplayer = meta.isMultiplayer ?? false;
        this.multiplayerAutoJoin = meta.multiplayerAutoJoin ?? true;
        this.maxMultiplayerClientsPerRoom = meta.maxMultiplayerClientsPerRoom || 4;
        this.maxCollaboratorsInRoom = meta.maxCollaboratorsInRoom || 6;
        this.showHUD = meta.showHud ?? false;
        this.hudRenderer = meta.hudRenderer === "uikit" ? "uikit" : "html";
        this.showStats = meta.showStats ?? false;
        this.showMemoryStats = meta.showMemoryStats ?? false;
        this.useInstancing = meta.useInstancing ?? false;
        this.voiceChatEnabled = meta.voiceChatEnabled ?? false;
        this.rendering = renderingApiToEditor(meta.rendering as any);
    }
}
