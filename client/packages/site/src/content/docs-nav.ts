export interface DocEntry {
    slug: string;
    title: string;
    source: "repo-docs" | "repo-root";
    file: string;
}

export interface DocSection {
    label: string;
    entries: DocEntry[];
}

export const DOC_SECTIONS: DocSection[] = [
    {
        label: "Get started",
        entries: [
            {slug: "introduction", title: "Introduction", source: "repo-root", file: "README.md"},
        ],
    },
    {
        label: "Engine",
        entries: [
            {slug: "architecture", title: "Architecture", source: "repo-docs", file: "architecture.md"},
            {slug: "exporting-a-game", title: "Exporting a game", source: "repo-docs", file: "exporting-a-game.md"},
            {slug: "server-side-storage", title: "Server-side storage & version control", source: "repo-docs", file: "server-side-storage.md"},
        ],
    },
    {
        label: "APIs",
        entries: [
            {slug: "runtime-api", title: "Runtime API", source: "repo-docs", file: "runtime-api.md"},
            {slug: "gameobject-and-game-manager-api", title: "GameObject & GameManager", source: "repo-docs", file: "gameobject-and-game-manager-api.md"},
            {slug: "uikit-api", title: "UIKit API", source: "repo-docs", file: "uikit-api.md"},
        ],
    },
    {
        label: "AI & Multiplayer",
        entries: [
            {slug: "byok", title: "BYOK & AI providers", source: "repo-docs", file: "byok.md"},
            {slug: "multiplayer", title: "Multiplayer", source: "repo-docs", file: "multiplayer.md"},
        ],
    },
    {
        label: "Community",
        entries: [
            {slug: "contributing", title: "Contributing", source: "repo-root", file: "CONTRIBUTING.md"},
        ],
    },
];

export const DEFAULT_SLUG = "introduction";

export function findDoc(slug: string): DocEntry | undefined {
    for (const section of DOC_SECTIONS) {
        const hit = section.entries.find((e) => e.slug === slug);
        if (hit) return hit;
    }
    return undefined;
}
