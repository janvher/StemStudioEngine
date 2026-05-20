import {normalizeGradientMode, parseBackgroundGradient, parseShadowMapType} from "../utils/renderingSettingsNormalization";

/**
 *
 * @param parameters
 */
function normalizeSceneBackgroundParameters(parameters: Record<string, any>): Record<string, any> {
    const normalized = {...parameters};

    if (Object.prototype.hasOwnProperty.call(normalized, "gradient")) {
        const parsedGradient = parseBackgroundGradient(normalized.gradient);
        if (parsedGradient !== undefined) {
            normalized.gradient = parsedGradient;
        }
    }

    if (Object.prototype.hasOwnProperty.call(normalized, "gradientMode")) {
        normalized.gradientMode = normalizeGradientMode(normalized.gradientMode);
    }

    return normalized;
}

/**
 *
 * @param parameters
 */
function normalizeSceneLightingParameters(parameters: Record<string, any>): Record<string, any> {
    if (!parameters.shadows || typeof parameters.shadows !== "object") {
        return parameters;
    }

    const normalizedShadows = {...parameters.shadows};
    if (Object.prototype.hasOwnProperty.call(normalizedShadows, "mapType")) {
        const parsedMapType = parseShadowMapType(normalizedShadows.mapType);
        if (parsedMapType !== undefined) {
            normalizedShadows.mapType = parsedMapType;
        }
    }

    return {...parameters, shadows: normalizedShadows};
}

/**
 *
 * @param parameters
 */
function normalizeRenderingParameters(parameters: Record<string, any>): Record<string, any> {
    const normalized = {...parameters};

    if (Object.prototype.hasOwnProperty.call(normalized, "shadowMapType")) {
        const parsedShadowMapType = parseShadowMapType(normalized.shadowMapType);
        if (parsedShadowMapType !== undefined) {
            normalized.shadowMapType = parsedShadowMapType;
        }
    }

    return normalized;
}

/**
 *
 * @param parameters
 */
function normalizeSceneCompartmentsParameters(parameters: Record<string, any>): Record<string, any> {
    const normalized = {...parameters};
    const value = normalized.enabled;
    if (typeof value === "string") {
        switch (value.trim().toLowerCase()) {
            case "on":
            case "true":
            case "1":
                normalized.enabled = true;
                break;
            case "off":
            case "false":
            case "0":
                normalized.enabled = false;
                break;
        }
    }
    return normalized;
}

/**
 *
 * @param commandName
 * @param parameters
 */
export function normalizeCommandParameters(commandName: string, parameters: Record<string, any>): Record<string, any> {
    switch (commandName) {
        case "set_scene_background":
            return normalizeSceneBackgroundParameters(parameters);
        case "set_scene_lighting":
            return normalizeSceneLightingParameters(parameters);
        case "set_rendering_settings":
            return normalizeRenderingParameters(parameters);
        case "set_scene_compartments":
            return normalizeSceneCompartmentsParameters(parameters);
        default:
            return parameters;
    }
}
