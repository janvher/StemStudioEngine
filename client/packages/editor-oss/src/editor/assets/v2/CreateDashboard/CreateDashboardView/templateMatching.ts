import type {FileData} from "../../types/file";

const STOP_WORDS = new Set([
    "a", "an", "the", "is", "it", "to", "of", "in", "on", "and", "or", "for",
    "with", "my", "me", "i", "we", "you", "your", "our", "that", "this",
    "make", "create", "build", "want", "like", "game", "games", "project",
    "experience", "template", "where", "can", "do", "be", "have", "has",
    "was", "are", "been", "will", "would", "should", "could", "about", "some",
    "very", "just", "but", "not", "from", "they", "them", "its", "also", "so",
    "please", "using", "into",
]);

type TemplateMatchInput = Pick<FileData, "Name" | "Description" | "Tags">;

const tokenize = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);

export const extractKeywords = (prompt: string): string[] =>
    tokenize(prompt)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w))
        .slice(0, 5);

const normalizeTags = (tags: string | string[]) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;

    try {
        const parsed = JSON.parse(tags) as unknown;
        return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
    } catch {
        return tokenize(tags);
    }
};

const templateTokens = (template: TemplateMatchInput) => {
    const tags = normalizeTags(template.Tags).join(" ");
    return tokenize(`${template.Name} ${template.Description} ${tags}`);
};

const keywordMatchesToken = (keyword: string, token: string) =>
    token === keyword || token.includes(keyword) || (keyword.length > 4 && token.length > 4 && keyword.includes(token));

export const templateMatchesPrompt = (template: TemplateMatchInput, prompt: string) => {
    const keywords = extractKeywords(prompt);
    if (keywords.length === 0) return false;

    const tokens = templateTokens(template);
    if (tokens.length === 0) return false;

    return keywords.some(keyword => tokens.some(token => keywordMatchesToken(keyword, token)));
};

export const getPromptMatchedTemplates = <T extends TemplateMatchInput>(templates: T[], prompt: string): T[] =>
    templates.filter(template => templateMatchesPrompt(template, prompt));
