import {parse} from "yaml";

export interface ImportPack {
    /** Stable identifier — also the asset name when cloned into a scene. */
    name: string;
    /** Free-form description shown in the picker. */
    description: string;
    /** JavaScript source. Cloned verbatim into the new scene-level Script asset. */
    code: string;
}

interface PackFile {
    meta?: {tool?: string; type?: string; exportVersion?: number};
    config?: {name?: string; description?: string};
    code?: string;
}

// Curated, read-only "system" packs (state machines, noise, octree, the UIKit
// dual-mode helper, …). Bundled into the client via Vite at build time so we
// can ship a new pack with a normal client deploy — no backend round-trip.
//
// Each file is a StemStudio import-export YAML envelope (`meta` / `config` /
// `code`), the same shape users get when they export a Script asset from the
// editor; new packs can be added by dropping the exported YAML into this
// directory.
const rawPacks = import.meta.glob<string>("./*.yaml", {
    query: "?raw",
    import: "default",
    eager: true,
});

let cache: ImportPack[] | null = null;

const loadPacks = (): ImportPack[] => {
    if (cache) return cache;

    const out: ImportPack[] = [];
    for (const [path, raw] of Object.entries(rawPacks)) {
        let pf: PackFile;
        try {
            pf = parse(raw) as PackFile;
        } catch (err) {
            console.error(`[builtinPacks] failed to parse ${path}:`, err);
            continue;
        }

        // Accept legacy `import` and current `script` envelopes.
        const t = pf.meta?.type;
        if (t !== "import" && t !== "script") {
            console.warn(`[builtinPacks] ${path}: unexpected meta.type=${t}`);
            continue;
        }

        const name = pf.config?.name?.trim();
        const code = pf.code;
        if (!name || !code) {
            console.warn(`[builtinPacks] ${path}: missing config.name or code`);
            continue;
        }

        out.push({
            name,
            description: (pf.config?.description ?? "").replace(/\n+$/, ""),
            code,
        });
    }

    out.sort((a, b) => a.name.localeCompare(b.name));
    cache = out;
    return out;
};

/**
 * Returns the curated, read-only "system" script packs shipped with the editor.
 * Resolved synchronously from bundled YAML — kept `async` for backwards
 * compatibility with the previous server-fetched API.
 */
export const getSystemImportPacks = async (): Promise<ImportPack[]> => loadPacks();
