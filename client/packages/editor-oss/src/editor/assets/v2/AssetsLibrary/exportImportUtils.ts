import {stringify, parse} from "yaml";

import type {LambdaConfig} from "../../../../lambdas/Lambda";
import type {BehaviorConfig} from "../../../behaviors/BehaviorConfig";

export const EXPORT_VERSION = 1;
const TOOL_NAME = "StemStudio";

type ExportType = "behavior" | "lambda" | "import" | "stem";

export interface ImportAssetConfig {
    name: string;
    description?: string;
}

interface ExportDocument {
    meta: {
        tool: string;
        type: ExportType;
        exportVersion: number;
        exportedAt: string;
    };
    config: Record<string, any>;
    code: string;
}

export interface ImportResult<T> {
    config: T;
    code: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const buildFilename = (name: string, type: ExportType): string => {
    const safeName = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const date = new Date().toISOString().slice(0, 10);
    return `${safeName}-${type}-${date}.yaml`;
};

const buildDocument = (type: ExportType, config: Record<string, any>, code: string): string => {
    const doc: ExportDocument = {
        meta: {
            tool: TOOL_NAME,
            type,
            exportVersion: EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
        },
        config,
        code,
    };

    return `# ${TOOL_NAME} Export File\n# Do not edit manually unless you know what you're doing\n\n${stringify(doc, {lineWidth: 0})}`;
};

const triggerDownload = (content: string, filename: string) => {
    const blob = new Blob([content], {type: "text/yaml;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const readFileText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });

const parseAndValidate = (text: string, expectedType: ExportType): ExportDocument => {
    // Strip leading comment lines before parsing
    const yamlBody = text.replace(/^#[^\n]*\n/gm, "");
    const doc = parse(yamlBody) as ExportDocument;

    if (!doc?.meta?.tool || doc.meta.tool !== TOOL_NAME) {
        throw new Error("Not a valid StemStudio export file");
    }
    if (doc.meta.type !== expectedType) {
        throw new Error(`Expected ${expectedType} file but got ${doc.meta.type}`);
    }
    if (!doc.config) {
        throw new Error("Missing config section");
    }
    if (typeof doc.code !== "string") {
        throw new Error("Missing code section");
    }
    return doc;
};

// ── Export ────────────────────────────────────────────────────────────────────

export const exportBehavior = (config: BehaviorConfig, code: string): void => {
    const yaml = buildDocument("behavior", config, code);
    triggerDownload(yaml, buildFilename(config.name, "behavior"));
};

export const exportLambda = (config: LambdaConfig, code: string): void => {
    const yaml = buildDocument("lambda", config, code);
    triggerDownload(yaml, buildFilename(config.name, "lambda"));
};

export const exportImportAsset = (config: ImportAssetConfig, code: string): void => {
    const yaml = buildDocument("import", {name: config.name, description: config.description}, code);
    triggerDownload(yaml, buildFilename(config.name, "import"));
};

export const buildImportDocument = (config: ImportAssetConfig, code: string): string =>
    buildDocument("import", {name: config.name, description: config.description}, code);

// ── Import ────────────────────────────────────────────────────────────────────

export const importBehaviorFile = async (file: File): Promise<ImportResult<BehaviorConfig>> => {
    const text = await readFileText(file);
    const doc = parseAndValidate(text, "behavior");
    const config = doc.config as unknown as BehaviorConfig;

    if (!config.name || !config.id) {
        throw new Error("Invalid behavior config: missing name or id");
    }

    return {config, code: doc.code};
};

export const importLambdaFile = async (file: File, currentUserHandle?: string): Promise<ImportResult<LambdaConfig>> => {
    const text = await readFileText(file);
    const doc = parseAndValidate(text, "lambda");
    const config = doc.config as unknown as LambdaConfig;

    if (!config.name || !config.id) {
        throw new Error("Invalid lambda config: missing name or id");
    }

    if (currentUserHandle) {
        config.id = resolveImportedLambdaId(config.id, config.name, currentUserHandle);
    }

    return {config, code: doc.code};
};

export const importImportFile = async (file: File): Promise<ImportResult<ImportAssetConfig>> => {
    const text = await readFileText(file);
    const doc = parseAndValidate(text, "import");
    const config = doc.config as unknown as ImportAssetConfig;

    if (!config.name || typeof config.name !== "string") {
        throw new Error("Invalid import config: missing name");
    }

    return {
        config: {
            name: config.name,
            description: typeof config.description === "string" ? config.description : undefined,
        },
        code: doc.code,
    };
};

// ── Stem Export / Import ─────────────────────────────────────────────────────

export interface EmbeddedBehavior {
    originalAssetId: string;
    name: string;
    config: Record<string, any>;
    code: string;
}

export interface EmbeddedLambda {
    originalAssetId: string;
    name: string;
    config: Record<string, any>;
    code: string;
}

export interface EmbeddedImport {
    originalAssetId: string;
    name: string;
    code: string;
}

interface StemExportDocument {
    meta: {tool: string; type: "stem"; exportVersion: number; exportedAt: string};
    sourceServer?: string;
    stemName: string;
    data: string;
    assetResolutionContext: {
        logicalIdToAssetId: Record<string, string>;
        assetIdToRevisionId: Record<string, string>;
    };
    embeddedAssets: {
        behaviors: EmbeddedBehavior[];
        lambdas: EmbeddedLambda[];
        imports: EmbeddedImport[];
    };
}

export interface StemImportResult {
    sourceServer?: string;
    stemName: string;
    data: string;
    assetResolutionContext: {
        logicalIdToAssetId: Record<string, string>;
        assetIdToRevisionId: Record<string, string>;
    };
    embeddedAssets: {
        behaviors: EmbeddedBehavior[];
        lambdas: EmbeddedLambda[];
        imports: EmbeddedImport[];
    };
}

export const exportStem = (
    stemName: string,
    data: string,
    assetResolutionContext: StemImportResult["assetResolutionContext"],
    embeddedAssets: StemImportResult["embeddedAssets"],
    sourceServer?: string,
): void => {
    const doc: StemExportDocument = {
        meta: {
            tool: TOOL_NAME,
            type: "stem",
            exportVersion: EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
        },
        sourceServer,
        stemName,
        data,
        assetResolutionContext,
        embeddedAssets,
    };

    const yaml = `# ${TOOL_NAME} Export File\n# Do not edit manually unless you know what you're doing\n\n${stringify(doc, {lineWidth: 0})}`;
    triggerDownload(yaml, buildFilename(stemName, "stem"));
};

export const importStemFile = async (file: File): Promise<StemImportResult> => {
    const text = await readFileText(file);
    const yamlBody = text.replace(/^#[^\n]*\n/gm, "");
    const doc = parse(yamlBody) as StemExportDocument;

    if (!doc?.meta?.tool || doc.meta.tool !== TOOL_NAME) {
        throw new Error("Not a valid StemStudio export file");
    }
    if (doc.meta.type !== "stem") {
        throw new Error(`Expected stem file but got ${doc.meta.type}`);
    }
    if (!doc.stemName) {
        throw new Error("Missing stemName");
    }
    if (typeof doc.data !== "string") {
        throw new Error("Missing data");
    }
    if (!doc.assetResolutionContext) {
        throw new Error("Missing assetResolutionContext");
    }

    return {
        sourceServer: doc.sourceServer,
        stemName: doc.stemName,
        data: doc.data,
        assetResolutionContext: {
            logicalIdToAssetId: doc.assetResolutionContext.logicalIdToAssetId || {},
            assetIdToRevisionId: doc.assetResolutionContext.assetIdToRevisionId || {},
        },
        embeddedAssets: {
            behaviors: doc.embeddedAssets?.behaviors || [],
            lambdas: doc.embeddedAssets?.lambdas || [],
            imports: doc.embeddedAssets?.imports || [],
        },
    };
};

/**
 * Sanitise a string into a valid JS identifier fragment (lowercase, no spaces).
 * @param s
 */
const toValidId = (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

/**
 * If the importing user's handle matches the original author's handle, keep
 * the ID as-is. Otherwise build a new ID using the current user's handle.
 * @param originalId
 * @param name
 * @param currentUserHandle
 */
export const resolveImportedLambdaId = (originalId: string, name: string, currentUserHandle: string): string => {
    const dotIndex = originalId.indexOf(".");
    const originalHandle = dotIndex !== -1 ? originalId.slice(0, dotIndex) : "";
    const currentHandle = toValidId(currentUserHandle);

    if (originalHandle === currentHandle) {
        return originalId;
    }

    return `${currentHandle}.${toValidId(name)}`;
};
