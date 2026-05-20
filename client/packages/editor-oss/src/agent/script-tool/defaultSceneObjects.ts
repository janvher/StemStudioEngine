import type {Object3D} from "three";

/**
 * Names of the four objects that ship with every blank scene. Lookup is by
 * exact name match because these objects are seeded by the editor with stable
 * names; users may rename them after the fact, in which case they are no
 * longer treated as defaults (intentional — a renamed default is treated as
 * user-authored content).
 */
export const DEFAULT_OBJECT_NAMES: ReadonlySet<string> = new Set([
    "DefaultCamera",
    "AmbientLight",
    "HemisphereLight",
    "Directional Light",
]);

export const isDefaultSceneObject = (object: Object3D): boolean =>
    DEFAULT_OBJECT_NAMES.has(object.name);
