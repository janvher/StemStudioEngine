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
