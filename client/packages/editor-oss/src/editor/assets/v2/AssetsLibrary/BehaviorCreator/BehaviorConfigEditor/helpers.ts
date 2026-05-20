// eslint-disable-next-line no-control-regex
export const invalidTagCharsRegex = /[<>{}[\]|\\/^~\x00-\x1F\x7F]/;

export const normalizeTag = (tag: string) => {
    return tag.trim().toLowerCase();
};

export const validateTag = (tag: string): string | null => {
    if (tag.length < 2 || tag.length > 50) {
        return "Tag must be 2-50 characters";
    }

    if (invalidTagCharsRegex.test(tag)) {
        return "Tag contains invalid characters";
    }

    return null;
};

export const canAddTag = (existingTags: string[] | undefined) => {
    return !existingTags || existingTags.length < 20;
};
