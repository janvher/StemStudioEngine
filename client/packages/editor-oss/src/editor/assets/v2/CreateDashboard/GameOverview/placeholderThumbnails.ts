import arcadeShooter from "./placeholders/arcade-shooter.png";
import astronautArcade from "./placeholders/astronaut-arcade.png";
import catGamer from "./placeholders/cat-gamer.png";
import couchGamer from "./placeholders/couch-gamer.png";
import cyberCockpit from "./placeholders/cyber-cockpit.png";
import guitarHero from "./placeholders/guitar-hero.png";
import handheldMascot from "./placeholders/handheld-mascot.png";
import monkeyGamer from "./placeholders/monkey-gamer.png";
import retroCollage from "./placeholders/retro-collage.png";
import vrBattle from "./placeholders/vr-battle.png";

export const PLACEHOLDER_PREFIX = "placeholder:";

const PLACEHOLDER_MAP: Record<string, string> = {
    "monkey-gamer": monkeyGamer,
    "arcade-shooter": arcadeShooter,
    "astronaut-arcade": astronautArcade,
    "vr-battle": vrBattle,
    "cat-gamer": catGamer,
    "cyber-cockpit": cyberCockpit,
    "retro-collage": retroCollage,
    "handheld-mascot": handheldMascot,
    "couch-gamer": couchGamer,
    "guitar-hero": guitarHero,
};

const PLACEHOLDER_NAMES = Object.keys(PLACEHOLDER_MAP);
const PLACEHOLDERS = Object.values(PLACEHOLDER_MAP);

const PLACEHOLDER_TAGS: Record<string, string[]> = {
    "monkey-gamer": ["monkey", "animal", "jungle", "adventure", "platformer"],
    "arcade-shooter": ["arcade", "shooter", "gun", "fps", "action", "shoot", "space"],
    "astronaut-arcade": ["space", "astronaut", "sci-fi", "rocket", "galaxy", "alien"],
    "vr-battle": ["vr", "virtual", "battle", "fight", "combat", "arena", "war"],
    "cat-gamer": ["cat", "pet", "animal", "cute", "casual"],
    "cyber-cockpit": ["cyber", "cyberpunk", "tech", "future", "robot", "mech", "drive"],
    "retro-collage": ["retro", "pixel", "classic", "vintage", "8bit", "nostalgic"],
    "handheld-mascot": ["handheld", "mobile", "portable", "mascot", "cartoon"],
    "couch-gamer": ["couch", "multiplayer", "party", "coop", "friends", "local"],
    "guitar-hero": ["music", "guitar", "rhythm", "dance", "band", "song"],
};

/**
 * Returns a deterministic placeholder thumbnail for a given scene ID.
 * Uses a simple hash of the ID string to pick one of 10 images.
 * @param sceneId
 */
export const getPlaceholderThumbnail = (sceneId: string): string => {
    let hash = 0;
    for (let i = 0; i < sceneId.length; i++) {
        hash = (hash * 31 + sceneId.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % PLACEHOLDERS.length;
    return PLACEHOLDERS[index] ?? PLACEHOLDERS[0]!;
};

/**
 * Scores each placeholder against prompt keywords and returns the best-matching
 * placeholder identifier (e.g. "placeholder:arcade-shooter").
 * Falls back to a random placeholder if no keywords match.
 * @param keywords
 */
export const getKeywordMatchedPlaceholder = (keywords: string[]): string => {
    if (keywords.length === 0) return getRandomPlaceholderIdentifier();

    let bestName = "";
    let bestScore = 0;

    for (const name of PLACEHOLDER_NAMES) {
        const tags = PLACEHOLDER_TAGS[name] ?? [];
        let score = 0;
        for (const kw of keywords) {
            if (tags.some(tag => tag.includes(kw) || kw.includes(tag))) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            bestName = name;
        }
    }

    if (bestScore === 0) return getRandomPlaceholderIdentifier();
    return `${PLACEHOLDER_PREFIX}${bestName}`;
};

/** Returns a random placeholder identifier string (e.g. "placeholder:cat-gamer"). */
export const getRandomPlaceholderIdentifier = (): string => {
    const name = PLACEHOLDER_NAMES[Math.floor(Math.random() * PLACEHOLDER_NAMES.length)]!;
    return `${PLACEHOLDER_PREFIX}${name}`;
};

/**
 * Resolves a placeholder identifier to a bundled image path.
 * Returns null if the identifier is not a valid placeholder.
 * @param id
 */
export const resolvePlaceholderIdentifier = (id: string): string | null => {
    if (!id.startsWith(PLACEHOLDER_PREFIX)) return null;
    const name = id.slice(PLACEHOLDER_PREFIX.length);
    return PLACEHOLDER_MAP[name] ?? null;
};
