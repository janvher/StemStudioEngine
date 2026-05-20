import {useSyncExternalStore} from "react";

const LOCATION_CHANGE_EVENT = "stemstudio:locationchange";

let historyPatched = false;

function notifyLocationChange() {
    window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
}

function patchHistory() {
    if (historyPatched || typeof window === "undefined") {
        return;
    }

    historyPatched = true;

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = function pushState(...args) {
        const result = originalPushState(...args);
        notifyLocationChange();
        return result;
    };

    window.history.replaceState = function replaceState(...args) {
        const result = originalReplaceState(...args);
        notifyLocationChange();
        return result;
    };
}

function subscribe(onStoreChange: () => void) {
    if (typeof window === "undefined") {
        return () => {};
    }

    patchHistory();

    window.addEventListener("popstate", onStoreChange);
    window.addEventListener(LOCATION_CHANGE_EVENT, onStoreChange);

    return () => {
        window.removeEventListener("popstate", onStoreChange);
        window.removeEventListener(LOCATION_CHANGE_EVENT, onStoreChange);
    };
}

function getSnapshot() {
    if (typeof window === "undefined") {
        return "";
    }

    return window.location.pathname;
}

export function useWindowPathname() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
