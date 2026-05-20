const EDITOR_ROUTE_STATE_KEY = "stemstudio.editorRouteState";

export type EditorRouteState = {
    autoCreate?: boolean;
    sandboxStarter?: boolean;
    revisionId?: string;
    headRevisionId?: string;
    openAvatarCreator?: boolean;
};

export const openEditorRoute = (url: string, state?: EditorRouteState) => {
    if (state && Object.keys(state).length > 0) {
        sessionStorage.setItem(EDITOR_ROUTE_STATE_KEY, JSON.stringify(state));
    } else {
        sessionStorage.removeItem(EDITOR_ROUTE_STATE_KEY);
    }

    window.location.assign(url);
};

export const readEditorRouteState = <T extends EditorRouteState>() => {
    const raw = sessionStorage.getItem(EDITOR_ROUTE_STATE_KEY);
    if (!raw) return null;

    sessionStorage.removeItem(EDITOR_ROUTE_STATE_KEY);

    try {
        return JSON.parse(raw) as T;
    } catch (error) {
        console.warn("[editorHandoff] Failed to parse stored route state", error);
        return null;
    }
};
