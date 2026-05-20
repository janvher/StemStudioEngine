import {normalizeCommandParameters} from "../parameterNormalization";
import {ScriptExecutor, ScriptLine} from "./ScriptExecutor";

export interface CheckAssertion {
    path: string;
    expected: unknown;
}

export interface CheckProbe {
    lineNumber: number;
    raw: string;
    sourceCommand: string;
    getterCommand: string;
    getterParams: Record<string, unknown>;
    assertions: CheckAssertion[];
    note?: string;
}

export interface CheckSkip {
    lineNumber: number;
    raw: string;
    command: string;
    reason: string;
}

export interface CheckMismatch {
    lineNumber: number;
    raw: string;
    getterCommand: string;
    getterParams: Record<string, unknown>;
    path: string;
    expected: unknown;
    actual: unknown;
    reason: string;
}

export interface CheckProbeResult {
    probe: CheckProbe;
    success: boolean;
    message?: string;
    mismatches: CheckMismatch[];
}

export interface ScriptCheckReport {
    totalCommands: number;
    probes: number;
    passed: number;
    failed: number;
    skipped: CheckSkip[];
    results: CheckProbeResult[];
}

export type CheckGetterExecutor = (
    command: string,
    params: Record<string, unknown>,
) => Promise<{
    success: boolean;
    data?: unknown;
    message?: string;
    error?: string;
}>;

const READ_ONLY_PREFIXES = ["get_", "list_", "search_"];
const TOLERANCE = 0.0001;

/**
 * Return only the getter probes derived from a parsed StemScript. Tests use this
 * pure helper; runtime validation uses `runScriptCheck` below.
 */
export function deriveCheckProbes(lines: ScriptLine[]): CheckProbe[] {
    return deriveCheckPlan(lines).probes;
}

export function deriveCheckPlan(lines: ScriptLine[]): {probes: CheckProbe[]; skipped: CheckSkip[]; totalCommands: number} {
    const probes: CheckProbe[] = [];
    const skipped: CheckSkip[] = [];
    let totalCommands = 0;

    for (const line of lines) {
        const parsed = line.parsed;
        if (!parsed || line.isComment || line.isEmpty) {
            continue;
        }

        totalCommands++;

        if (parsed.isBuiltin) {
            skipped.push({
                lineNumber: line.lineNumber,
                raw: parsed.raw,
                command: parsed.command,
                reason: "built-in command",
            });
            continue;
        }

        if (isReadOnlyCommand(parsed.command)) {
            skipped.push({
                lineNumber: line.lineNumber,
                raw: parsed.raw,
                command: parsed.command,
                reason: "read-only command",
            });
            continue;
        }

        const normalizedParams = normalizeCommandParameters(parsed.command, parsed.params);
        const lineProbes = deriveProbeForCommand(line.lineNumber, parsed.raw, parsed.command, normalizedParams);
        if (lineProbes.length === 0) {
            skipped.push({
                lineNumber: line.lineNumber,
                raw: parsed.raw,
                command: parsed.command,
                reason: "no deterministic getter probe available",
            });
            continue;
        }

        probes.push(...lineProbes);
    }

    return {probes, skipped, totalCommands};
}

export async function runScriptCheck(content: string, executeGetter: CheckGetterExecutor): Promise<ScriptCheckReport> {
    const plan = deriveCheckPlan(ScriptExecutor.parseScript(content));
    const results: CheckProbeResult[] = [];
    let passed = 0;
    let failed = 0;

    for (const probe of plan.probes) {
        const getterResult = await executeGetter(probe.getterCommand, probe.getterParams);
        if (!getterResult.success) {
            failed++;
            results.push({
                probe,
                success: false,
                message: getterResult.error || getterResult.message || "Getter failed",
                mismatches: [{
                    lineNumber: probe.lineNumber,
                    raw: probe.raw,
                    getterCommand: probe.getterCommand,
                    getterParams: probe.getterParams,
                    path: "(getter)",
                    expected: "success",
                    actual: getterResult.error || getterResult.message || "failed",
                    reason: "getter failed",
                }],
            });
            continue;
        }

        const mismatches = compareProbe(probe, getterResult.data);
        const success = mismatches.length === 0;
        if (success) {
            passed++;
        } else {
            failed++;
        }
        results.push({
            probe,
            success,
            message: getterResult.message,
            mismatches,
        });
    }

    return {
        totalCommands: plan.totalCommands,
        probes: plan.probes.length,
        passed,
        failed,
        skipped: plan.skipped,
        results,
    };
}

export function formatCheckReport(report: ScriptCheckReport): string {
    const lines: string[] = [];
    lines.push("## StemScript Check");
    lines.push("");
    lines.push(`Commands: ${report.totalCommands}`);
    lines.push(`Probes: ${report.probes}`);
    lines.push(`Passed: ${report.passed}`);
    lines.push(`Failed: ${report.failed}`);
    lines.push(`Skipped: ${report.skipped.length}`);

    const failedResults = report.results.filter(result => !result.success);
    if (failedResults.length > 0) {
        lines.push("");
        lines.push("### Mismatches");
        for (const result of failedResults) {
            for (const mismatch of result.mismatches) {
                lines.push(
                    `- Line ${mismatch.lineNumber} \`${mismatch.raw}\`: \`${mismatch.path}\` expected \`${formatValue(mismatch.expected)}\`, got \`${formatValue(mismatch.actual)}\` (${mismatch.reason}; getter \`${mismatch.getterCommand}\`)`,
                );
            }
        }
    }

    if (report.skipped.length > 0) {
        lines.push("");
        lines.push("### Skipped");
        for (const skipped of report.skipped.slice(0, 12)) {
            lines.push(`- Line ${skipped.lineNumber} \`${skipped.raw}\`: ${skipped.reason}`);
        }
        if (report.skipped.length > 12) {
            lines.push(`- ${report.skipped.length - 12} more skipped command(s)`);
        }
    }

    return lines.join("\n");
}

function deriveProbeForCommand(
    lineNumber: number,
    raw: string,
    command: string,
    params: Record<string, unknown>,
): CheckProbe[] {
    const probes: CheckProbe[] = [];
    const assertions: CheckAssertion[] = [];

    switch (command) {
        case "create_primitive": {
            const target = stringParam(params.name);
            const kind = stringParam(params.type);
            if (!target) return [];
            addObjectTransformAssertions(assertions, params);
            addObjectSettingsAssertions(assertions, params.objectSettings);
            addMaterialAssertions(assertions, params);
            addPrimitiveGeometryAssertions(assertions, params);
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_object_settings",
                getterParams: {target, kind},
                assertions: [
                    {path: "name", expected: target},
                    ...(kind ? [{path: "kind", expected: normalizePrimitiveKind(kind)}] : []),
                    ...assertions,
                ],
            });
            break;
        }
        case "create_group": {
            const target = stringParam(params.name);
            if (!target) return [];
            addObjectTransformAssertions(assertions, params);
            addObjectSettingsAssertions(assertions, params.objectSettings);
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_object_settings",
                getterParams: {target, kind: "group"},
                assertions: [{path: "name", expected: target}, {path: "kind", expected: "group"}, ...assertions],
            });
            break;
        }
        case "modify_object": {
            const target = stringParam(params.name) || stringParam(params.target);
            if (!target) return [];
            addObjectTransformAssertions(assertions, params);
            addObjectSettingsAssertions(assertions, params.objectSettings);
            addMaterialAssertions(assertions, params);
            if (params.name !== undefined) assertions.push({path: "name", expected: params.name});
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_object_settings",
                getterParams: {target},
                assertions,
            });
            break;
        }
        case "move_object": {
            const target = stringParam(params.target);
            if (!target) return [];
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_object_settings",
                getterParams: {target},
                assertions: params.parent === null || params.parent === "null"
                    ? []
                    : [{path: "parent.name", expected: params.parent}],
            });
            break;
        }
        case "set_material": {
            const target = stringParam(params.target);
            if (!target) return [];
            addMaterialAssertions(assertions, params, "");
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_material_settings",
                getterParams: {target},
                assertions,
            });
            break;
        }
        case "set_texture":
        case "set_external_texture": {
            const target = stringParam(params.target);
            if (!target) return [];
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_material_settings",
                getterParams: {target},
                assertions: [],
                note: "texture asset resolution is verified by object/material existence",
            });
            break;
        }
        case "enable_physics":
        case "disable_physics": {
            const target = stringParam(params.target);
            if (!target) return [];
            const physicsAssertions = command === "enable_physics"
                ? physicsAssertionsFrom(params, {enabled: true})
                : [{path: "physics.enabled", expected: false}];
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_physics_settings",
                getterParams: {target},
                assertions: physicsAssertions,
            });
            break;
        }
        case "set_physics": {
            const target = stringParam(params.target);
            if (!target) return [];
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_physics_settings",
                getterParams: {target},
                assertions: physicsAssertionsFrom(params),
            });
            break;
        }
        case "set_physics_engine":
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_scene_setting",
                getterParams: {category: "physics"},
                assertions: [
                    ...(params.type !== undefined ? [{path: "engine", expected: params.type}] : []),
                    ...(params.gravity !== undefined ? [{path: "gravity", expected: params.gravity}] : []),
                ],
            });
            break;
        case "set_scene_lighting": {
            if (params.ambient !== undefined) assertions.push({path: "ambient", expected: params.ambient});
            if (params.hemisphere !== undefined) assertions.push({path: "hemisphere", expected: params.hemisphere});
            const shadows = params.shadows as Record<string, unknown> | undefined;
            if (shadows?.enabled !== undefined) assertions.push({path: "useShadows", expected: shadows.enabled});
            if (shadows?.mapType !== undefined) assertions.push({path: "shadowMapType", expected: shadows.mapType});
            probes.push(sceneProbe(lineNumber, raw, command, "lighting", assertions));
            break;
        }
        case "set_scene_fog":
            probes.push(sceneProbe(lineNumber, raw, command, "fog", directAssertions(params, ["type", "color", "near", "far", "density"])));
            break;
        case "set_scene_background":
            probes.push(sceneProbe(lineNumber, raw, command, "background", directAssertions(params, ["type", "color", "texture", "cubemap", "gradient", "gradientMode", "rotation", "intensity", "blurriness"])));
            break;
        case "set_tone_mapping":
            probes.push(sceneProbe(lineNumber, raw, command, "toneMapping", directAssertions(params, ["type", "exposure"])));
            break;
        case "set_post_processing": {
            for (const category of ["ao", "bloom", "dof", "outline"]) {
                if (params[category] === undefined) continue;
                probes.push(sceneProbe(lineNumber, raw, command, category, [{path: "", expected: params[category]}]));
            }
            break;
        }
        case "set_camera_settings": {
            const target = stringParam(params.target);
            if (!target) return [];
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_camera_settings",
                getterParams: {target},
                assertions: directAssertions(params, [
                    "fov",
                    "near",
                    "far",
                    "cameraType",
                    "defaultDistance",
                    "minDistance",
                    "maxDistance",
                    "headHeight",
                    "axis",
                    "occlusionType",
                ]),
            });
            break;
        }
        case "set_game_settings":
            probes.push(sceneProbe(lineNumber, raw, command, "game", [
                ...(params.isGame !== undefined || params.enabled !== undefined
                    ? [{path: "isGame", expected: params.isGame ?? params.enabled}]
                    : []),
                ...directAssertions(params, ["lives", "maxScore", "timer", "useAvatar", "isMultiplayer", "showHUD", "isSandbox", "voiceChatEnabled"]),
            ]));
            break;
        case "set_rendering_settings":
            probes.push(sceneProbe(lineNumber, raw, command, "rendering", directAssertions(params, ["useShadows", "useInstancing", "shadowMapType", "usePhysicsWorker"])));
            break;
        case "set_scene_compartments":
            probes.push(sceneProbe(lineNumber, raw, command, "compartments", [{path: "compartmentsEnabled", expected: params.enabled}]));
            break;
        case "set_project_title":
            probes.push(sceneProbe(lineNumber, raw, command, "project", [{path: "title", expected: params.title}]));
            break;
        case "set_light_properties": {
            const target = stringParam(params.target);
            if (!target) return [];
            if (params.shadowMapSize !== undefined) {
                assertions.push({path: "shadow.mapSize.width", expected: params.shadowMapSize});
                assertions.push({path: "shadow.mapSize.height", expected: params.shadowMapSize});
            }
            if (params.shadowBias !== undefined) assertions.push({path: "shadow.bias", expected: params.shadowBias});
            if (params.shadowNormalBias !== undefined) {
                assertions.push({path: "shadow.normalBias", expected: params.shadowNormalBias});
            }
            if (params.shadowRadius !== undefined) assertions.push({path: "shadow.radius", expected: params.shadowRadius});
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_light_settings",
                getterParams: {target},
                assertions: [...directAssertions(params, ["intensity", "color", "castShadow"]), ...assertions],
            });
            break;
        }
        case "detach_behavior": {
            const target = stringParam(params.target);
            if (!target) return [];
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_object_settings",
                getterParams: {target},
                assertions: [],
                note: "detached behavior is verified by object existence in this pass",
            });
            break;
        }
        case "attach_behavior":
        case "set_behavior_config": {
            const target = stringParam(params.target);
            if (!target) return [];
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_behavior_settings",
                getterParams: {
                    target,
                    ...(params.behaviorId !== undefined ? {behaviorId: params.behaviorId} : {}),
                },
                assertions: [
                    ...(params.config !== undefined ? [{path: "behavior.attributesData", expected: params.config}] : []),
                    ...(params.attributesData !== undefined ? [{path: "behavior.attributesData", expected: params.attributesData}] : []),
                    ...(params.enabled !== undefined ? [{path: "behavior.enabled", expected: params.enabled}] : []),
                ],
            });
            break;
        }
        case "add_navmesh": {
            const target = stringParam(params.target) || "Default Scene";
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_behavior_settings",
                getterParams: {target, behaviorId: "navmesh"},
                assertions: [{path: "behavior.attributesData", expected: compactParams(params, ["target"])}],
            });
            break;
        }
        case "add_vfx":
        case "modify_vfx": {
            const target = stringParam(params.target) || stringParam(params.name);
            if (!target) return [];
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_vfx",
                getterParams: {target},
                assertions: [
                    ...(params.name !== undefined ? [{path: "name", expected: params.name}] : []),
                    ...(params.position !== undefined ? [{path: "position", expected: params.position}] : []),
                ],
            });
            break;
        }
        case "add_model_to_scene":
        case "add_prefab_to_scene": {
            const target = stringParam(params.name);
            if (!target) return [];
            probes.push({
                lineNumber,
                raw,
                sourceCommand: command,
                getterCommand: "get_object_settings",
                getterParams: {target},
                assertions: [{path: "name", expected: target}],
                note: "asset import details are partially verified by scene object existence",
            });
            break;
        }
        default:
            break;
    }

    return probes;
}

function isReadOnlyCommand(command: string): boolean {
    return READ_ONLY_PREFIXES.some(prefix => command.startsWith(prefix)) || command === "player" || command === "select";
}

function stringParam(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
}

function directAssertions(params: Record<string, unknown>, keys: string[], prefix = ""): CheckAssertion[] {
    const assertions: CheckAssertion[] = [];
    for (const key of keys) {
        if (params[key] !== undefined) {
            assertions.push({path: prefix ? `${prefix}.${key}` : key, expected: params[key]});
        }
    }
    return assertions;
}

function physicsAssertionsFrom(
    params: Record<string, unknown>,
    overrides: Record<string, unknown> = {},
): CheckAssertion[] {
    const expected = {
        ...(params.config && typeof params.config === "object" ? params.config as Record<string, unknown> : {}),
        ...compactParams(params, ["target", "config"]),
        ...overrides,
    };

    return Object.entries(expected).map(([key, value]) => ({
        path: `physics.${key}`,
        expected: value,
    }));
}

function addObjectTransformAssertions(assertions: CheckAssertion[], params: Record<string, unknown>): void {
    if (params.position !== undefined) assertions.push({path: "transform.position", expected: params.position});
    if (params.rotation !== undefined) assertions.push({path: "transform.rotation", expected: params.rotation});
    if (params.scale !== undefined) assertions.push({path: "transform.scale", expected: params.scale});
}

function addObjectSettingsAssertions(assertions: CheckAssertion[], objectSettings: unknown): void {
    if (!objectSettings || typeof objectSettings !== "object") return;
    for (const [key, value] of Object.entries(objectSettings as Record<string, unknown>)) {
        assertions.push({path: `objectSettings.${key}`, expected: value});
    }
}

function addMaterialAssertions(assertions: CheckAssertion[], params: Record<string, unknown>, prefix = "material"): void {
    const materialPaths: Record<string, string> = {
        color: "color",
        opacity: "opacity",
        metalness: "metalness",
        roughness: "roughness",
        tileAmountX: "tileAmountX",
        tileAmountY: "tileAmountY",
        panningSpeedX: "panningSpeedX",
        panningSpeedY: "panningSpeedY",
    };
    for (const [paramKey, pathKey] of Object.entries(materialPaths)) {
        if (params[paramKey] !== undefined) {
            assertions.push({path: prefix ? `${prefix}.${pathKey}` : pathKey, expected: params[paramKey]});
        }
    }
}

function addPrimitiveGeometryAssertions(assertions: CheckAssertion[], params: Record<string, unknown>): void {
    const size = params.size as {x?: number; y?: number; z?: number} | undefined;
    const type = normalizePrimitiveKind(stringParam(params.type) || "");
    if (size && typeof size === "object") {
        switch (type) {
            case "box":
                addOptional(assertions, "geometry.parameters.width", size.x);
                addOptional(assertions, "geometry.parameters.height", size.y);
                addOptional(assertions, "geometry.parameters.depth", size.z);
                break;
            case "sphere":
                addOptional(assertions, "geometry.parameters.radius", size.x !== undefined ? size.x / 2 : undefined);
                break;
            case "cylinder":
                addOptional(assertions, "geometry.parameters.radiusTop", size.x !== undefined ? size.x / 2 : undefined);
                addOptional(assertions, "geometry.parameters.radiusBottom", size.x !== undefined ? size.x / 2 : undefined);
                addOptional(assertions, "geometry.parameters.height", size.y);
                break;
            case "cone":
                addOptional(assertions, "geometry.parameters.radius", size.x !== undefined ? size.x / 2 : undefined);
                addOptional(assertions, "geometry.parameters.height", size.y);
                break;
            case "plane":
                addOptional(assertions, "geometry.parameters.width", size.x);
                addOptional(assertions, "geometry.parameters.height", size.z);
                break;
            case "torus":
                addOptional(assertions, "geometry.parameters.radius", size.x !== undefined ? size.x / 2 : undefined);
                addOptional(assertions, "geometry.parameters.tube", size.y !== undefined ? size.y / 2 : undefined);
                break;
            case "capsule":
                addOptional(assertions, "geometry.parameters.radius", size.x !== undefined ? size.x / 2 : undefined);
                addOptional(assertions, "geometry.parameters.height", size.y);
                break;
            case "ring":
                addOptional(assertions, "geometry.parameters.innerRadius", size.x !== undefined ? size.x / 2 : undefined);
                addOptional(assertions, "geometry.parameters.outerRadius", size.y !== undefined ? size.y / 2 : undefined);
                break;
            default:
                break;
        }
    }

    for (const key of [
        "widthSegments",
        "heightSegments",
        "depthSegments",
        "radialSegments",
        "tubularSegments",
        "thetaSegments",
        "phiSegments",
        "capSegments",
    ]) {
        addOptional(assertions, `geometry.parameters.${key}`, params[key]);
    }
}

function addOptional(assertions: CheckAssertion[], path: string, expected: unknown): void {
    if (expected !== undefined) {
        assertions.push({path, expected});
    }
}

function sceneProbe(
    lineNumber: number,
    raw: string,
    sourceCommand: string,
    category: string,
    assertions: CheckAssertion[],
): CheckProbe {
    return {
        lineNumber,
        raw,
        sourceCommand,
        getterCommand: "get_scene_setting",
        getterParams: {category},
        assertions,
    };
}

function compactParams(params: Record<string, unknown>, omit: string[]): Record<string, unknown> {
    const omitted = new Set(omit);
    return Object.fromEntries(Object.entries(params).filter((entry) => !omitted.has(entry[0]) && entry[1] !== undefined));
}

function normalizePrimitiveKind(kind: string): string {
    return kind.trim().toLowerCase().replace(/[\s_-]/g, "");
}

function compareProbe(probe: CheckProbe, data: unknown): CheckMismatch[] {
    const mismatches: CheckMismatch[] = [];
    for (const assertion of probe.assertions) {
        const actual = assertion.path ? getPath(data, assertion.path) : data;
        const mismatch = compareValue(assertion.expected, actual, assertion.path);
        if (!mismatch) continue;
        mismatches.push({
            lineNumber: probe.lineNumber,
            raw: probe.raw,
            getterCommand: probe.getterCommand,
            getterParams: probe.getterParams,
            path: assertion.path || "(root)",
            expected: assertion.expected,
            actual,
            reason: mismatch,
        });
    }
    return mismatches;
}

function getPath(value: unknown, path: string): unknown {
    const parts = path.split(".");
    let current: any = value;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }
    return current;
}

function compareValue(expected: unknown, actual: unknown, path: string): string | null {
    if (typeof expected === "number" && typeof actual === "number") {
        return Math.abs(expected - actual) <= TOLERANCE ? null : "number mismatch";
    }

    if (typeof expected === "string" && typeof actual === "string") {
        const expectedValue = normalizeStringForPath(expected, path);
        const actualValue = normalizeStringForPath(actual, path);
        return expectedValue === actualValue ? null : "string mismatch";
    }

    if (Array.isArray(expected)) {
        if (!Array.isArray(actual)) return "array mismatch";
        if (expected.length !== actual.length) return "array length mismatch";
        for (let i = 0; i < expected.length; i++) {
            const childMismatch = compareValue(expected[i], actual[i], `${path}.${i}`);
            if (childMismatch) return childMismatch;
        }
        return null;
    }

    if (expected && typeof expected === "object") {
        if (!actual || typeof actual !== "object") return "object mismatch";
        for (const [key, expectedValue] of Object.entries(expected as Record<string, unknown>)) {
            const actualValue = (actual as Record<string, unknown>)[key];
            const childMismatch = compareValue(expectedValue, actualValue, path ? `${path}.${key}` : key);
            if (childMismatch) return childMismatch;
        }
        return null;
    }

    return Object.is(expected, actual) ? null : "value mismatch";
}

function normalizeStringForPath(value: string, path: string): string {
    if (/color/i.test(path)) {
        return value.toLowerCase();
    }
    if (/cameraType/i.test(path)) {
        return value.toLowerCase().replace(/[\s_-]/g, "");
    }
    if (path === "physics.shape" || path.endsWith(".physics.shape")) {
        return normalizePhysicsShape(value);
    }
    if (path === "physics.ctype" || path.endsWith(".physics.ctype")) {
        return value.toLowerCase();
    }
    if (path === "kind") {
        return normalizePrimitiveKind(value);
    }
    return value;
}

function normalizePhysicsShape(value: string): string {
    const normalized = value.trim().toLowerCase().replace(/[\s_-]/g, "");
    const aliases: Record<string, string> = {
        box: "btboxshape",
        sphere: "btsphereshape",
        capsule: "btcapsuleshape",
        cylinder: "btcapsuleshape",
        convexhull: "btconvexhullshape",
        concavehull: "btconcavehullshape",
        trimesh: "btconcavehullshape",
    };
    return aliases[normalized] || normalized;
}

function formatValue(value: unknown): string {
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}
