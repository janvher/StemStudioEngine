import * as acorn from "acorn";

import {AssetType, getSceneAssets} from "@stem/network/api/asset";
import {getScriptRevisionData} from "@stem/network/api/script";
import {assetRefKey} from "@stem/editor-oss/asset-management/AssetRef";
import {
    emptyAssetResolutionContext,
    resolveAssetId,
    resolveAssetRevisionId,
    type ReadonlyAssetResolutionContext,
} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {isScriptsEnabled} from "@stem/editor-oss/utils/featureFlags";

export interface ScriptImportDirective {
    specifier: string;
    alias: string;
    lineNumber: number;
    raw: string;
}

export interface ScriptImportParseError {
    lineNumber: number;
    column: number;
    message: string;
}

export interface ParsedScriptImports {
    code: string;
    directives: ScriptImportDirective[];
    errors: ScriptImportParseError[];
}

export interface ScriptImportDependency {
    assetId: string;
    revisionId: string;
    specifier: string;
    alias: string;
}

export interface ScriptImportRevisionData {
    assetId: string;
    revisionId: string;
    code: string;
}

export type ScriptImportRevisionMap = Record<string, ScriptImportRevisionData>;

type AcornNode = acorn.Node & Record<string, any>;

const IMPORT_DIRECTIVE_RE = /^(\s*)@import\s+(['"])([^"']+)\2\s+as\s+([A-Za-z_$][\w$]*)\s*;?\s*$/;

const buildDirectiveError = (lineNumber: number, line: string, message: string): ScriptImportParseError => ({
    lineNumber,
    column: Math.max(line.indexOf("@import"), 0) + 1,
    message,
});

export const parseScriptImports = (source: string): ParsedScriptImports => {
    const directives: ScriptImportDirective[] = [];
    const errors: ScriptImportParseError[] = [];
    const seenAliases = new Map<string, number>();
    const strippedLines = source.split("\n").map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith("@import")) {
            return line;
        }

        const match = line.match(IMPORT_DIRECTIVE_RE);
        if (!match) {
            errors.push(
                buildDirectiveError(
                    index + 1,
                    line,
                    'Invalid @import directive. Use: @import "asset-or-logical-id" as alias',
                ),
            );
            return "";
        }

        const specifier = match[3]!;
        const alias = match[4]!;
        const previousLine = seenAliases.get(alias);
        if (previousLine) {
            errors.push(
                buildDirectiveError(
                    index + 1,
                    line,
                    `Duplicate import alias "${alias}" (already declared on line ${previousLine})`,
                ),
            );
            return "";
        }

        seenAliases.set(alias, index + 1);
        directives.push({
            specifier,
            alias,
            lineNumber: index + 1,
            raw: line,
        });
        // Preserve line numbers for validation / breakpoints.
        return "";
    });

    return {
        code: strippedLines.join("\n"),
        directives,
        errors,
    };
};

const resolveDirective = (
    directive: ScriptImportDirective,
    context: ReadonlyAssetResolutionContext,
): ScriptImportDependency => {
    const assetId = resolveAssetId(directive.specifier, context);
    const revisionId = resolveAssetRevisionId(directive.specifier, context);
    if (!revisionId) {
        throw new Error(
            `Unable to resolve import "${directive.specifier}" as ${directive.alias} on line ${directive.lineNumber}`,
        );
    }

    return {
        assetId,
        revisionId,
        specifier: directive.specifier,
        alias: directive.alias,
    };
};

export const getScriptImportDependencies = (
    source: string,
    context: ReadonlyAssetResolutionContext = emptyAssetResolutionContext,
): ScriptImportDependency[] => {
    const parsed = parseScriptImports(source);
    if (parsed.errors.length > 0) {
        throw new Error(parsed.errors[0]!.message);
    }

    return parsed.directives.map(directive => resolveDirective(directive, context));
};

export const getScriptImportDependencyMap = (
    source: string,
    context: ReadonlyAssetResolutionContext = emptyAssetResolutionContext,
): Record<string, string> => {
    return getScriptImportDependencies(source, context).reduce(
        (acc, dep) => {
            acc[dep.assetId] = dep.revisionId;
            return acc;
        },
        {} as Record<string, string>,
    );
};

export const buildNameAwareScriptImportContext = async (
    sceneId: string | null | undefined,
    context: ReadonlyAssetResolutionContext = emptyAssetResolutionContext,
    options: {force?: boolean; allowFetchFailure?: boolean} = {},
): Promise<ReadonlyAssetResolutionContext> => {
    if (!sceneId || (!isScriptsEnabled() && !options.force)) {
        return context;
    }

    let assets: Awaited<ReturnType<typeof getSceneAssets>>["assets"];
    try {
        ({assets} = await getSceneAssets(sceneId, {
            types: [AssetType.Script],
        }));
    } catch (error) {
        if (options.allowFetchFailure) {
            console.warn("[ScriptImport] Failed to load scene script names; using bundled/context names only.", error);
            return context;
        }
        throw error;
    }

    if (assets.length === 0) {
        return context;
    }

    const nameToAssetId: Record<string, string> = {
        ...context.nameToAssetId,
    };

    for (const asset of assets) {
        const normalizedName = asset.name?.trim().toLowerCase();
        if (!normalizedName) {
            continue;
        }
        nameToAssetId[normalizedName] = asset.id;
    }

    return {
        ...context,
        nameToAssetId,
    };
};

export const remapScriptImportSpecifiers = (
    source: string,
    remapAssetId: (assetId: string) => string,
): string => {
    return source
        .split("\n")
        .map((line) => {
            const match = line.match(IMPORT_DIRECTIVE_RE);
            if (!match) {
                return line;
            }

            const originalSpecifier = match[3]!;
            // Only rewrite concrete asset IDs. Logical IDs remain stable.
            if (!/^[a-fA-F0-9]{24}$/.test(originalSpecifier)) {
                return line;
            }

            const remapped = remapAssetId(originalSpecifier);
            if (remapped === originalSpecifier) {
                return line;
            }

            return line.replace(originalSpecifier, remapped);
        })
        .join("\n");
};

const isAstNode = (value: unknown): value is AcornNode =>
    typeof value === "object" && value !== null && typeof (value as {type?: unknown}).type === "string";

const collectTopLevelFunctionExports = (source: string): string[] => {
    const ast = acorn.parse(source, {
        ecmaVersion: "latest",
        sourceType: "script",
        locations: false,
    }) as AcornNode;

    const names = new Set<string>();
    const body = Array.isArray(ast.body) ? ast.body : [];
    for (const node of body) {
        if (!isAstNode(node)) continue;

        if (node.type === "FunctionDeclaration" && node.id?.name) {
            names.add(node.id.name);
            continue;
        }

        if (node.type !== "VariableDeclaration" || !Array.isArray(node.declarations)) {
            continue;
        }

        for (const declaration of node.declarations) {
            if (!isAstNode(declaration) || declaration.id?.type !== "Identifier") {
                continue;
            }

            const init = declaration.init;
            if (!isAstNode(init)) {
                continue;
            }

            if (init.type === "FunctionExpression" || init.type === "ArrowFunctionExpression") {
                names.add(declaration.id.name);
            }
        }
    }

    return [...names];
};

const buildModuleWrapper = (source: string, exportNames: string[], sourceUrl: string): string => {
    const exportLines = exportNames
        .map(name => `if (typeof ${name} === "function") __module[${JSON.stringify(name)}] = ${name};`)
        .join("\n");

    return `
        "use strict";
        ${source}
        const __module = {};
        ${exportLines}
        return Object.freeze(__module);
        //# sourceURL=${sourceUrl}
    `;
};

export interface BuildScriptImportAliasOptions {
    source: string;
    context?: ReadonlyAssetResolutionContext;
    importRevisionMap?: ScriptImportRevisionMap;
    runtimeEndowments?: Record<string, unknown>;
    useCompartment?: boolean;
}

export const buildScriptImportAliases = ({
    source,
    context = emptyAssetResolutionContext,
    importRevisionMap = {},
    runtimeEndowments = {},
    useCompartment = false,
}: BuildScriptImportAliasOptions): Record<string, Readonly<Record<string, unknown>>> => {
    const parsed = parseScriptImports(source);
    if (parsed.errors.length > 0) {
        throw new Error(parsed.errors[0]!.message);
    }

    const moduleCache = new Map<string, Readonly<Record<string, unknown>>>();
    const visitStack = new Set<string>();

    const buildModuleForRef = (assetId: string, revisionId: string): Readonly<Record<string, unknown>> => {
        const key = assetRefKey({assetId, revisionId});
        const cached = moduleCache.get(key);
        if (cached) {
            return cached;
        }
        if (visitStack.has(key)) {
            throw new Error(`Import cycle detected while loading ${key}`);
        }

        const entry = importRevisionMap[key];
        if (!entry) {
            throw new Error(`Missing import asset source for ${key}`);
        }

        visitStack.add(key);
        const childParsed = parseScriptImports(entry.code);
        if (childParsed.errors.length > 0) {
            throw new Error(childParsed.errors[0]!.message);
        }

        const childAliases = childParsed.directives.reduce(
            (acc, directive) => {
                const dependency = resolveDirective(directive, context);
                acc[directive.alias] = buildModuleForRef(dependency.assetId, dependency.revisionId);
                return acc;
            },
            {} as Record<string, Readonly<Record<string, unknown>>>,
        );

        const exportNames = collectTopLevelFunctionExports(childParsed.code);
        const sourceUrl = `import://${assetId}/${revisionId}`;
        const moduleCode = buildModuleWrapper(childParsed.code, exportNames, sourceUrl);
        const endowments = {...runtimeEndowments, ...childAliases};
        const argNames = Object.keys(endowments);
        const argValues = Object.values(endowments);

        let moduleObject: Readonly<Record<string, unknown>>;
        if (useCompartment) {
            const compartment = new Compartment(endowments);
            moduleObject = compartment.evaluate(`(() => { ${moduleCode} })()`);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-implied-eval -- intentional: script imports execute user-authored module code
            moduleObject = new Function(...argNames, moduleCode)(...argValues) as Readonly<Record<string, unknown>>;
        }

        visitStack.delete(key);
        moduleCache.set(key, moduleObject);
        return moduleObject;
    };

    return parsed.directives.reduce(
        (acc, directive) => {
            const dependency = resolveDirective(directive, context);
            acc[directive.alias] = buildModuleForRef(dependency.assetId, dependency.revisionId);
            return acc;
        },
        {} as Record<string, Readonly<Record<string, unknown>>>,
    );
};

export const loadScriptImportRevisionMap = async (
    source: string,
    context: ReadonlyAssetResolutionContext = emptyAssetResolutionContext,
    existing: ScriptImportRevisionMap = {},
): Promise<ScriptImportRevisionMap> => {
    const revisionMap = {...existing};
    const visiting = new Set<string>();

    const visitSource = async (currentSource: string) => {
        const dependencies = getScriptImportDependencies(currentSource, context);
        for (const dependency of dependencies) {
            const key = assetRefKey(dependency);
            if (visiting.has(key)) {
                throw new Error(`Import cycle detected while loading ${key}`);
            }
            if (revisionMap[key]) {
                continue;
            }

            visiting.add(key);
            const {code} = await getScriptRevisionData(dependency.assetId, dependency.revisionId);
            revisionMap[key] = {
                assetId: dependency.assetId,
                revisionId: dependency.revisionId,
                code,
            };
            await visitSource(code);
            visiting.delete(key);
        }
    };

    await visitSource(source);
    return revisionMap;
};
