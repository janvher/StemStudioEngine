import {DirectionalLight, HemisphereLight, Light, Object3D, PointLight, RectAreaLight, SpotLight} from "three";

import {ExtendedDirectionalLight} from "@stem/editor-oss/light/ExtendedDirectionalLight";

/**
 * Type guard to check if an object is a Light
 * @param obj - The object to check
 * @returns True if the object is a Light
 */
export function isLight(obj: Object3D): obj is Light {
    return (obj as Light).isLight === true;
}

/**
 * Type guard to check if an object is a DirectionalLight
 * @param obj - The object to check
 * @returns True if the object is a DirectionalLight
 */
export function isDirectionalLight(obj: Object3D): obj is DirectionalLight {
    return (obj as DirectionalLight).isDirectionalLight === true;
}

/**
 * Type guard to check if an object is a ExtendedDirectionalLight
 * @param obj - The object to check
 * @returns True if the object is a ExtendedDirectionalLight
 */
export function isExtendedDirectionalLight(obj: Object3D): obj is ExtendedDirectionalLight {
    return (obj as ExtendedDirectionalLight).isExtendedDirectionalLight === true;
}

/**
 * Type guard to check if an object is a PointLight
 * @param obj - The object to check
 * @returns True if the object is a PointLight
 */
export function isPointLight(obj: Object3D): obj is PointLight {
    return (obj as PointLight).isPointLight === true;
}

/**
 * Type guard to check if an object is a SpotLight
 * @param obj - The object to check
 * @returns True if the object is a SpotLight
 */
export function isSpotLight(obj: Object3D): obj is SpotLight {
    return (obj as SpotLight).isSpotLight === true;
}

/**
 * Type guard to check if an object is a HemisphereLight
 * @param obj - The object to check
 * @returns True if the object is a HemisphereLight
 */
export function isHemisphereLight(obj: Object3D): obj is HemisphereLight {
    return (obj as HemisphereLight).isHemisphereLight === true;
}

/**
 * Type guard to check if an object is a RectAreaLight
 * @param obj - The object to check
 * @returns True if the object is a RectAreaLight
 */
export function isRectAreaLight(obj: Object3D): obj is RectAreaLight {
    return (obj as RectAreaLight).isRectAreaLight === true;
}
