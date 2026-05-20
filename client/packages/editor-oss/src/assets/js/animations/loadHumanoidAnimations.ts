import type {AnimationClip} from "three";

/**
 * Placeholder for a future humanoid-fallback loader. The original
 * implementation tried to bake Mixamo FBX clips onto arbitrary avatars,
 * but Mixamo's bone names (`mixamorigHips`, …) do not match the names
 * the AvatarCreator pipeline produces (`Garden_Party_Avatar`,
 * `Body_Main`, … with custom skeleton names), so every track failed to
 * bind and animations went silent.
 *
 * Returns an empty list. Callers (ModelLoader, AiNpcBehavior,
 * AvatarCreator SceneManager) fall through to the model's own embedded
 * clips when this returns empty, which is what worked previously.
 *
 * If/when a real retargeter ships, restore the FBX load here and pair
 * it with a skeleton-aware retargeter in `applyHumanoidAnimations`.
 */
export function loadHumanoidAnimations(): Promise<AnimationClip[]> {
    return Promise.resolve([]);
}
