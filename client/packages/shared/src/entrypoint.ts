export enum AppEntrypoint {
    PUBLIC = "public",
    EDITOR = "editor",
    PLAY = "play",
}

declare global {
    interface Window {
        __STEM_APP_ENTRYPOINT__?: AppEntrypoint;
    }
}

export const setAppEntrypoint = (entrypoint: AppEntrypoint) => {
    window.__STEM_APP_ENTRYPOINT__ = entrypoint;
};

export const getAppEntrypoint = () => {
    return window.__STEM_APP_ENTRYPOINT__ || AppEntrypoint.PUBLIC;
};
