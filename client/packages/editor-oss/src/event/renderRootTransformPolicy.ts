export type RootTransformPolicy = "auto-reset" | "warn-only" | "ignore";

type TransformLike = {
    x: number;
    y: number;
    z: number;
    set: (x: number, y: number, z: number) => void;
};

type RootLike = {
    position: TransformLike;
    rotation: TransformLike;
    scale: TransformLike;
};

const VALID_POLICIES: RootTransformPolicy[] = ["auto-reset", "warn-only", "ignore"];

/**
 *
 * @param value
 */
function isValidPolicy(value: unknown): value is RootTransformPolicy {
    return typeof value === "string" && VALID_POLICIES.includes(value as RootTransformPolicy);
}

/**
 *
 * @param renderingUserData
 * @param urlSearch
 */
export function resolveRootTransformPolicy(
    renderingUserData: {rootTransformPolicy?: unknown} | null | undefined,
    urlSearch?: string,
): RootTransformPolicy {
    // URL override for safe rollout/debugging:
    // ?rootTransformPolicy=warn-only
    if (typeof urlSearch === "string" && urlSearch.length > 0) {
        const params = new URLSearchParams(urlSearch);
        const fromUrl = params.get("rootTransformPolicy");
        if (isValidPolicy(fromUrl)) {
            return fromUrl;
        }
    }

    const fromScene = renderingUserData?.rootTransformPolicy;
    if (isValidPolicy(fromScene)) {
        return fromScene;
    }

    return "auto-reset";
}

/**
 *
 * @param root
 */
export function hasNonIdentityTransform(root: RootLike): boolean {
    return (
        root.position.x !== 0 ||
        root.position.y !== 0 ||
        root.position.z !== 0 ||
        root.rotation.x !== 0 ||
        root.rotation.y !== 0 ||
        root.rotation.z !== 0 ||
        root.scale.x !== 1 ||
        root.scale.y !== 1 ||
        root.scale.z !== 1
    );
}

/**
 *
 * @param root
 */
export function resetRootTransform(root: RootLike): void {
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);
}
