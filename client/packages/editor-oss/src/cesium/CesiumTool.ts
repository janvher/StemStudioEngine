type CesiumModule = typeof import("cesium");

export interface CesiumLoadOptions {
    baseUrl?: string;
    widgetsCss?: boolean;
    ionAccessToken?: string | null;
}

const DEFAULT_BASE_URL = "/cesium";
const DEFAULT_CONTAINER_STYLES: Record<string, string> = {
    position: "absolute",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "0",
};

let cesiumPromise: Promise<CesiumModule> | null = null;

/**
 *
 * @param baseUrl
 */
function normalizeBaseUrl(baseUrl?: string): string {
    const resolvedBaseUrl = (baseUrl || DEFAULT_BASE_URL).trim() || DEFAULT_BASE_URL;
    return resolvedBaseUrl.endsWith("/") ? resolvedBaseUrl.slice(0, -1) : resolvedBaseUrl;
}

/**
 *
 * @param baseUrl
 */
function ensureWidgetsCss(baseUrl: string): void {
    if (typeof document === "undefined") {
        return;
    }

    const href = `${baseUrl}/Widgets/widgets.css`;
    const existingLink = document.querySelector<HTMLLinkElement>(`link[data-cesium-widgets="true"][href="${href}"]`);
    if (existingLink) {
        return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.cesiumWidgets = "true";
    document.head.appendChild(link);
}

export const CesiumTool = {
    getBaseUrl(baseUrl?: string): string {
        return normalizeBaseUrl(baseUrl);
    },

    async load(options: CesiumLoadOptions = {}): Promise<CesiumModule> {
        const baseUrl = normalizeBaseUrl(options.baseUrl);
        (globalThis as any).CESIUM_BASE_URL = baseUrl;

        if (options.widgetsCss !== false) {
            ensureWidgetsCss(baseUrl);
        }

        const Cesium = await (cesiumPromise ??= import("cesium"));

        if (options.ionAccessToken) {
            Cesium.Ion.defaultAccessToken = options.ionAccessToken;
        }

        return Cesium;
    },

    ensureContainer(parent: HTMLElement, id = "cesium-viewer", styles: Record<string, string> = {}): HTMLDivElement {
        if (!parent.style.position) {
            parent.style.position = "relative";
        }

        let container = parent.querySelector<HTMLDivElement>(`#${CSS.escape(id)}`);
        if (!container) {
            container = document.createElement("div");
            container.id = id;
            parent.insertBefore(container, parent.firstChild);
        }

        Object.assign(container.style, DEFAULT_CONTAINER_STYLES, styles);
        return container;
    },

    destroyViewer(viewer: {destroy?: () => void; isDestroyed?: () => boolean} | null | undefined): void {
        if (!viewer) {
            return;
        }

        if (viewer.isDestroyed?.()) {
            return;
        }

        viewer.destroy?.();
    },
};

export default CesiumTool;
