import {marked} from "marked";
import {useEffect, useMemo, useState} from "react";

import {GITHUB_URL} from "../content/links";
import type {DocEntry} from "../content/docs-nav";

// Build-time raw imports keep docs in the static bundle (no fetch at runtime).
// Vite's `?raw` query returns the file as a string.
import architectureMd from "../../../../../docs/architecture.md?raw";
import byokMd from "../../../../../docs/byok.md?raw";
import exportingMd from "../../../../../docs/exporting-a-game.md?raw";
import gameObjectAndGameManagerApiMd from "../../../../../docs/gameobject-and-game-manager-api.md?raw";
import multiplayerMd from "../../../../../docs/multiplayer.md?raw";
import runtimeApiMd from "../../../../../docs/runtime-api.md?raw";
import serverSideStorageMd from "../../../../../docs/server-side-storage.md?raw";
import uikitApiMd from "../../../../../docs/uikit-api.md?raw";
import readmeMd from "../../../../../README.md?raw";
import contributingMd from "../../../../../CONTRIBUTING.md?raw";

const SOURCES: Record<string, string> = {
    "repo-docs:architecture.md": architectureMd,
    "repo-docs:byok.md": byokMd,
    "repo-docs:exporting-a-game.md": exportingMd,
    "repo-docs:gameobject-and-game-manager-api.md": gameObjectAndGameManagerApiMd,
    "repo-docs:multiplayer.md": multiplayerMd,
    "repo-docs:runtime-api.md": runtimeApiMd,
    "repo-docs:server-side-storage.md": serverSideStorageMd,
    "repo-docs:uikit-api.md": uikitApiMd,
    "repo-root:README.md": readmeMd,
    "repo-root:CONTRIBUTING.md": contributingMd,
};

interface Props {
    entry: DocEntry;
}

export function MarkdownPage({entry}: Props) {
    const key = `${entry.source}:${entry.file}`;
    const raw = SOURCES[key];

    const [html, setHtml] = useState<string>("");

    const cleaned = useMemo(() => rewriteRepoLinks(raw ?? "", entry), [raw, entry]);

    useEffect(() => {
        let active = true;
        Promise.resolve(marked.parse(cleaned, {async: true})).then((out) => {
            if (active) setHtml(typeof out === "string" ? out : "");
        });
        return () => {
            active = false;
        };
    }, [cleaned]);

    if (!raw) {
        return <div className="docs-empty">Page not found.</div>;
    }

    return (
        <article
            className="docs-content"
            // Trusted source: markdown ships from the repo at build time. No
            // user-submitted content reaches this surface.
            dangerouslySetInnerHTML={{__html: html}}
        />
    );
}

function rewriteRepoLinks(md: string, entry: DocEntry): string {
    // Anchor non-curated relative links to the GitHub source so users don't
    // get 404s when a doc links to a file we haven't surfaced on the site.
    const basePath = entry.source === "repo-root" ? "" : "docs/";
    return md.replace(/\]\((?!https?:|#|\/)([^)]+)\)/g, (_match, rel: string) => {
        if (rel.startsWith("docs/")) {
            return `](${GITHUB_URL}/blob/main/${rel})`;
        }
        return `](${GITHUB_URL}/blob/main/${basePath}${rel})`;
    });
}
