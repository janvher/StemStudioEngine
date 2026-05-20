import type {AnimationClip, Object3D} from "three";

/**
 * Placeholder for a future humanoid-fallback applier. The original
 * version cloned Mixamo clip tracks onto whatever skeleton it was
 * given, but the bone names never matched the AvatarCreator's custom
 * rig, so Three.js silently dropped every binding and no animation
 * played.
 *
 * Until a real skeleton-aware retargeter is in place, just return the
 * model's existing clips untouched. Callers that wrap this with
 * `loadHumanoidAnimations` get an empty `fallbackClips` list, so the
 * net effect is "use what the GLB already shipped with" — which is
 * exactly the behavior animations had before the failed refactor.
 */
export function applyHumanoidAnimations(
    target: Object3D,
    _fallbackClips: ReadonlyArray<AnimationClip>,
): AnimationClip[] {
    return Array.isArray(target.animations) ? target.animations : [];
}
