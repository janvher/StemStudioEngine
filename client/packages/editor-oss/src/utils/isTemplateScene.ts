let TEMPLATE_IDS = new Set<string>();

export const isTemplateScene = (sceneId?: string | null): boolean => {
    return !!sceneId && TEMPLATE_IDS.has(sceneId);
};

export const setTemplateIds = (ids: string[]): void => {
    if (ids.length > 0) {
        TEMPLATE_IDS = new Set(ids);
    }
};
