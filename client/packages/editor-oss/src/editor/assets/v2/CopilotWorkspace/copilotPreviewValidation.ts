import * as THREE from "three";

import type EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {BehaviorCodeValidator} from "@stem/editor-oss/agent/validation/BehaviorCodeValidator";
import {emptyAssetResolutionContext, getAssetResolutionContext} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import type {CopilotPreviewSession, CopilotValidationResult, CopilotValidationStatus} from "./copilotPreviewSession";
import {getCopilotPreviewRuntimeErrors} from "./copilotPreviewRuntimeErrors";

type ScriptRegistryLike = {
    getScripts?: () => Record<string, string>;
};

type BehaviorConfigRegistryLike = {
    getAllConfigs?: () => Array<{id?: string; isScript?: boolean}>;
};

type EditorValidationContext = {
    behaviorScriptRegistry?: ScriptRegistryLike;
    behaviorConfigRegistry?: BehaviorConfigRegistryLike;
    isMultiplayer?: boolean;
};

export type CopilotPreviewImpactSummary = {
    beforeAfterHighlights: string[];
    estimatedImpact: string;
};

const validationStatusPriority: Record<CopilotValidationStatus, number> = {
    fail: 4,
    warn: 3,
    pending: 2,
    pass: 1,
};

const worstStatus = (left: CopilotValidationStatus, right: CopilotValidationStatus): CopilotValidationStatus =>
    validationStatusPriority[left] >= validationStatusPriority[right] ? left : right;

const getSceneObjectCount = (scene: THREE.Scene | null | undefined): number => {
    if (!scene) return 0;
    let count = 0;
    scene.traverse(object => {
        if (object !== scene) count += 1;
    });
    return count;
};

const hasFiniteCameraState = (camera: THREE.Camera | null | undefined): boolean => {
    if (!camera) return false;
    const position = camera.position;
    return Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z);
};

const isPlayerCandidate = (object: THREE.Object3D): boolean => {
    const name = object.name?.trim().toLowerCase();
    const tags = Array.isArray(object.userData?.tags)
        ? object.userData.tags.map((tag: unknown) => String(tag).toLowerCase())
        : [];

    return name === "player" ||
        name === "camera target" ||
        tags.includes("player") ||
        object.userData?.isPlayer === true ||
        object.userData?.player === true;
};

const hasPhysicsConfiguredObject = (scene: THREE.Scene | null | undefined): boolean => {
    if (!scene) return false;
    let found = false;
    scene.traverse(object => {
        if (found) return;
        found = Boolean(object.userData?.physics || object.userData?.physicsConfig || object.userData?.rigidBody);
    });
    return found;
};

const collectBehaviorScripts = (app: EngineRuntime): Record<string, string> => {
    const editor = app.editor as EditorValidationContext | null | undefined;
    const registryScripts = editor?.behaviorScriptRegistry?.getScripts?.() ?? {};
    const sceneScripts = (app.scene?.userData?.scripts as Record<string, string> | undefined) ?? {};

    return {
        ...sceneScripts,
        ...registryScripts,
    };
};

const validateBehaviorScripts = (app: EngineRuntime): CopilotValidationResult => {
    const scripts = collectBehaviorScripts(app);
    const entries = Object.entries(scripts).filter(([, code]) => typeof code === "string" && code.trim().length > 0);

    if (entries.length === 0) {
        return {
            id: "generated-code-static",
            label: "Generated code static checks",
            status: "pass",
            detail: "No scene-local behavior scripts detected.",
        };
    }

    const validator = new BehaviorCodeValidator();
    let status: CopilotValidationStatus = "pass";
    let errorCount = 0;
    let warningCount = 0;
    const failedScripts: string[] = [];

    for (const [id, code] of entries) {
        const result = validator.validate(code, "behavior");
        errorCount += result.errorCount;
        warningCount += result.warningCount + result.infoCount;

        if (result.errorCount > 0) {
            status = worstStatus(status, "fail");
            failedScripts.push(id);
        } else if (result.warningCount > 0 || result.infoCount > 0) {
            status = worstStatus(status, "warn");
        }
    }

    return {
        id: "generated-code-static",
        label: "Generated code static checks",
        status,
        detail: status === "fail"
            ? `${errorCount} error${errorCount === 1 ? "" : "s"} in ${failedScripts.slice(0, 3).join(", ")}.`
            : warningCount > 0
              ? `${warningCount} warning${warningCount === 1 ? "" : "s"} across ${entries.length} script${entries.length === 1 ? "" : "s"}.`
              : `${entries.length} script${entries.length === 1 ? "" : "s"} passed.`,
    };
};

const validateLambdaScripts = (app: EngineRuntime): CopilotValidationResult => {
    const lambdaScripts = ((app.game as any)?.lambdaScripts ?? {}) as Record<string, string>;
    const entries = Object.entries(lambdaScripts).filter(([, code]) => typeof code === "string" && code.trim().length > 0);

    if (entries.length === 0) {
        return {
            id: "generated-lambda-static",
            label: "Generated lambda static checks",
            status: "pass",
            detail: "No loaded lambda scripts detected.",
        };
    }

    const validator = new BehaviorCodeValidator();
    let status: CopilotValidationStatus = "pass";
    let errorCount = 0;
    let warningCount = 0;
    const failedScripts: string[] = [];

    for (const [id, code] of entries) {
        const result = validator.validate(code, "lambda");
        errorCount += result.errorCount;
        warningCount += result.warningCount + result.infoCount;

        if (result.errorCount > 0) {
            status = worstStatus(status, "fail");
            failedScripts.push(id);
        } else if (result.warningCount > 0 || result.infoCount > 0) {
            status = worstStatus(status, "warn");
        }
    }

    return {
        id: "generated-lambda-static",
        label: "Generated lambda static checks",
        status,
        detail: status === "fail"
            ? `${errorCount} error${errorCount === 1 ? "" : "s"} in ${failedScripts.slice(0, 3).join(", ")}.`
            : warningCount > 0
              ? `${warningCount} warning${warningCount === 1 ? "" : "s"} across ${entries.length} lambda script${entries.length === 1 ? "" : "s"}.`
              : `${entries.length} lambda script${entries.length === 1 ? "" : "s"} passed.`,
    };
};

const validateRuntimeErrors = (
    app: EngineRuntime,
    session?: CopilotPreviewSession | null,
): CopilotValidationResult => {
    const previewErrors = session
        ? getCopilotPreviewRuntimeErrors(session.previewId, new Date(session.startedAt).getTime())
        : [];

    if (previewErrors.length > 0) {
        return {
            id: "runtime-errors",
            label: "No blocking runtime errors",
            status: "fail",
            detail: previewErrors[previewErrors.length - 1]?.message || "Runtime error detected during preview.",
        };
    }

    if (app.isPlaying && app.game) {
        return {
            id: "runtime-errors",
            label: "No blocking runtime errors",
            status: "pass",
            detail: "No runtime errors were captured while this preview was active.",
        };
    }

    return {
        id: "runtime-errors",
        label: "No blocking runtime errors",
        status: "pending",
        detail: "Start or restart playtest to capture runtime errors for this preview.",
    };
};

const validateAssetResolution = (app: EngineRuntime): CopilotValidationResult => {
    const context = app.scene ? getAssetResolutionContext(app.scene) ?? emptyAssetResolutionContext : emptyAssetResolutionContext;
    const logicalIdToAssetId = context.logicalIdToAssetId ?? {};
    const assetIdToRevisionId = context.assetIdToRevisionId ?? {};
    const nameToAssetId = context.nameToAssetId ?? {};
    const missingLogicalRefs = Object.entries(logicalIdToAssetId)
        .filter(([, assetId]) => !assetId)
        .map(([logicalId]) => logicalId);
    const assetRefCount = new Set([
        ...Object.values(logicalIdToAssetId),
        ...Object.keys(assetIdToRevisionId),
        ...Object.values(nameToAssetId),
    ].filter(Boolean)).size;

    if (missingLogicalRefs.length > 0) {
        return {
            id: "asset-resolution",
            label: "Asset references available",
            status: "warn",
            detail: `Missing asset ids for ${missingLogicalRefs.slice(0, 3).join(", ")}.`,
        };
    }

    return {
        id: "asset-resolution",
        label: "Asset references available",
        status: "pass",
        detail: assetRefCount > 0
            ? `${assetRefCount} referenced asset${assetRefCount === 1 ? "" : "s"} tracked in the scene context.`
            : "No external asset references detected.",
    };
};

const countSnapshotObjects = (session: CopilotPreviewSession): number => {
    return session.snapshot.sceneJson.filter(entry => {
        if (!entry || typeof entry !== "object") return false;
        const value = entry as {uuid?: unknown; type?: unknown};
        if (typeof value.uuid !== "string") return false;
        return value.type !== "Scene" && value.type !== "PerspectiveCamera" && value.type !== "OrthographicCamera";
    }).length;
};

const countSnapshotScripts = (session: CopilotPreviewSession): number => {
    return session.snapshot.sceneJson.filter(entry => {
        if (!entry || typeof entry !== "object") return false;
        const value = entry as {source?: unknown; isBehaviorScript?: unknown};
        return typeof value.source === "string" || value.isBehaviorScript === true;
    }).length;
};

const countSnapshotAssetRefs = (session: CopilotPreviewSession): number => {
    return new Set([
        ...Object.values(session.snapshot.assetResolutionContext.logicalIdToAssetId),
        ...Object.keys(session.snapshot.assetResolutionContext.assetIdToRevisionId),
        ...Object.values(session.snapshot.assetResolutionContext.nameToAssetId),
    ].filter(Boolean)).size;
};

const countCurrentAssetRefs = (app: EngineRuntime): number => {
    const context = app.scene ? getAssetResolutionContext(app.scene) ?? emptyAssetResolutionContext : emptyAssetResolutionContext;
    return new Set([
        ...Object.values(context.logicalIdToAssetId ?? {}),
        ...Object.keys(context.assetIdToRevisionId ?? {}),
        ...Object.values(context.nameToAssetId ?? {}),
    ].filter(Boolean)).size;
};

const formatDelta = (before: number, after: number): string => {
    const delta = after - before;
    if (delta === 0) return "no change";
    return delta > 0 ? `+${delta}` : `${delta}`;
};

const summarizeImpactFromValidation = (
    validationResults: CopilotValidationResult[],
    objectDelta: number,
): string => {
    if (validationResults.some(result => result.status === "fail")) {
        return "High: validation has blocking failures.";
    }
    if (validationResults.some(result => result.status === "warn" || result.status === "pending")) {
        return "Medium: review warnings and playtest before accepting.";
    }
    if (Math.abs(objectDelta) > 200) {
        return "Medium: object count changed enough to warrant performance testing.";
    }
    return "Low: structural checks passed with a small scene-level impact.";
};

export const summarizeCopilotPreviewImpact = (
    app: EngineRuntime,
    session: CopilotPreviewSession,
): CopilotPreviewImpactSummary => {
    const beforeObjectCount = countSnapshotObjects(session);
    const afterObjectCount = getSceneObjectCount(app.scene);
    const beforeScriptCount = countSnapshotScripts(session);
    const afterScriptCount = Object.keys(collectBehaviorScripts(app)).length;
    const beforeAssetRefCount = countSnapshotAssetRefs(session);
    const afterAssetRefCount = countCurrentAssetRefs(app);
    const beforeGameEnabled = session.snapshot.sceneJson.some(entry => {
        const userData = (entry as {userData?: {game?: {enabled?: boolean}}} | null)?.userData;
        return userData?.game?.enabled === true;
    });
    const afterGameEnabled = app.scene?.userData?.game?.enabled === true;

    return {
        beforeAfterHighlights: [
            `Objects: ${beforeObjectCount} -> ${afterObjectCount} (${formatDelta(beforeObjectCount, afterObjectCount)})`,
            `Behavior scripts: ${beforeScriptCount} -> ${afterScriptCount} (${formatDelta(beforeScriptCount, afterScriptCount)})`,
            `Asset refs: ${beforeAssetRefCount} -> ${afterAssetRefCount} (${formatDelta(beforeAssetRefCount, afterAssetRefCount)})`,
            `Game enabled: ${beforeGameEnabled ? "yes" : "no"} -> ${afterGameEnabled ? "yes" : "no"}`,
        ],
        estimatedImpact: summarizeImpactFromValidation(
            session.validationResults,
            afterObjectCount - beforeObjectCount,
        ),
    };
};

export const runCopilotPreviewValidation = (
    app: EngineRuntime,
    session?: CopilotPreviewSession | null,
): CopilotValidationResult[] => {
    const scene = app.scene;
    const objectCount = getSceneObjectCount(scene);
    const playerCandidates: THREE.Object3D[] = [];
    scene?.traverse(object => {
        if (isPlayerCandidate(object)) playerCandidates.push(object);
    });
    const gameEnabled = scene?.userData?.game?.enabled;
    const hasPhysicsObjects = hasPhysicsConfiguredObject(scene);
    const editor = app.editor as EditorValidationContext | null | undefined;

    return [
        {
            id: "scene-loads",
            label: "Scene loads",
            status: scene && objectCount > 0 ? "pass" : "fail",
            detail: scene ? `${objectCount} scene object${objectCount === 1 ? "" : "s"} available.` : "No active scene is loaded.",
        },
        {
            id: "player-spawn",
            label: "Player can spawn",
            status: playerCandidates.length > 0 ? "pass" : "warn",
            detail: playerCandidates.length > 0
                ? `Found ${playerCandidates[0]?.name || "player-tagged object"}.`
                : "No object named or tagged Player was found; camera-only games may still be valid.",
        },
        {
            id: "main-camera",
            label: "Main camera exists",
            status: hasFiniteCameraState(app.camera) ? "pass" : "fail",
            detail: hasFiniteCameraState(app.camera) ? "Camera position is valid." : "No usable main camera was found.",
        },
        {
            id: "game-enabled",
            label: "Game enabled",
            status: gameEnabled === true ? "pass" : "warn",
            detail: gameEnabled === true
                ? "Scene game mode is enabled."
                : "Default workspace playtest will enable game mode in memory before playing.",
        },
        validateAssetResolution(app),
        validateRuntimeErrors(app, session),
        {
            id: "physics-init",
            label: "Physics initializes",
            status: app.isPlaying && app.physics ? "pass" : hasPhysicsObjects ? "pending" : "pass",
            detail: app.isPlaying && app.physics
                ? "Physics runtime is active in playtest."
                : hasPhysicsObjects
                  ? "Physics objects were found; restart playtest to confirm runtime initialization."
                  : "No physics-enabled objects detected.",
        },
        validateBehaviorScripts(app),
        validateLambdaScripts(app),
        {
            id: "multiplayer-sync",
            label: "Multiplayer sync",
            status: editor?.isMultiplayer ? "pending" : "pass",
            detail: editor?.isMultiplayer
                ? "Multiplayer room sync needs a dedicated room validation pass."
                : "Single-player workspace preview.",
        },
        {
            id: "performance-budget",
            label: "Performance budget",
            status: objectCount > 1200 ? "warn" : "pass",
            detail: objectCount > 1200
                ? `${objectCount} objects may need performance testing.`
                : "Scene object count is within the lightweight preview budget.",
        },
    ];
};
