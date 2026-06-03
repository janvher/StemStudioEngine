export interface ViewportSafeArea {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    insetLeft: number;
    insetTop: number;
    insetRight: number;
    insetBottom: number;
}

interface RectLike {
    left: number;
    top: number;
    right?: number;
    bottom?: number;
    width: number;
    height: number;
}

interface MeasureViewportSafeAreaOptions {
    windowWidth: number;
    windowHeight: number;
    rect?: RectLike | null;
    occluders?: Array<RectLike | null | undefined>;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const EDGE_THRESHOLD_PX = 16;

const getEdge = (primary: number | undefined, fallback: number) =>
    Number.isFinite(primary) ? (primary as number) : fallback;

export const measureViewportSafeArea = ({
    windowWidth,
    windowHeight,
    rect,
    occluders = [],
}: MeasureViewportSafeAreaOptions): ViewportSafeArea => {
    const safeWindowWidth = Math.max(0, Number.isFinite(windowWidth) ? windowWidth : 0);
    const safeWindowHeight = Math.max(0, Number.isFinite(windowHeight) ? windowHeight : 0);

    if (!rect) {
        return {
            left: 0,
            top: 0,
            right: safeWindowWidth,
            bottom: safeWindowHeight,
            width: safeWindowWidth,
            height: safeWindowHeight,
            insetLeft: 0,
            insetTop: 0,
            insetRight: 0,
            insetBottom: 0,
        };
    }

    const rawLeft = Number.isFinite(rect.left) ? rect.left : 0;
    const rawTop = Number.isFinite(rect.top) ? rect.top : 0;
    const rawRight = getEdge(rect.right, rawLeft + (Number.isFinite(rect.width) ? rect.width : 0));
    const rawBottom = getEdge(rect.bottom, rawTop + (Number.isFinite(rect.height) ? rect.height : 0));

    const left = clamp(rawLeft, 0, safeWindowWidth);
    const top = clamp(rawTop, 0, safeWindowHeight);
    const right = clamp(rawRight, 0, safeWindowWidth);
    const bottom = clamp(rawBottom, 0, safeWindowHeight);
    const baseWidth = Math.max(0, right - left);
    const baseHeight = Math.max(0, bottom - top);

    let insetLeft = left;
    let insetTop = top;
    let insetRight = Math.max(0, safeWindowWidth - right);
    let insetBottom = Math.max(0, safeWindowHeight - bottom);

    occluders.forEach(occluder => {
        if (!occluder) return;

        const occluderLeft = clamp(occluder.left, 0, safeWindowWidth);
        const occluderTop = clamp(occluder.top, 0, safeWindowHeight);
        const occluderRight = clamp(getEdge(occluder.right, occluder.left + occluder.width), 0, safeWindowWidth);
        const occluderBottom = clamp(getEdge(occluder.bottom, occluder.top + occluder.height), 0, safeWindowHeight);

        if (occluderRight <= left || occluderLeft >= right || occluderBottom <= top || occluderTop >= bottom) {
            return;
        }

        if (occluderTop - top <= EDGE_THRESHOLD_PX) {
            insetTop = Math.max(insetTop, Math.max(0, occluderBottom - top) + top);
        }
        if (bottom - occluderBottom <= EDGE_THRESHOLD_PX) {
            insetBottom = Math.max(insetBottom, Math.max(0, bottom - occluderTop) + (safeWindowHeight - bottom));
        }
        if (occluderLeft - left <= EDGE_THRESHOLD_PX) {
            insetLeft = Math.max(insetLeft, Math.max(0, occluderRight - left) + left);
        }
        if (right - occluderRight <= EDGE_THRESHOLD_PX) {
            insetRight = Math.max(insetRight, Math.max(0, right - occluderLeft) + (safeWindowWidth - right));
        }
    });

    const safeLeft = insetLeft;
    const safeTop = insetTop;
    const safeRight = Math.max(safeLeft, safeWindowWidth - insetRight);
    const safeBottom = Math.max(safeTop, safeWindowHeight - insetBottom);
    const width = Math.max(0, Math.min(baseWidth, safeRight - safeLeft));
    const height = Math.max(0, Math.min(baseHeight, safeBottom - safeTop));

    return {
        left: safeLeft,
        top: safeTop,
        right: safeLeft + width,
        bottom: safeTop + height,
        width,
        height,
        insetLeft,
        insetTop,
        insetRight,
        insetBottom,
    };
};

export const getViewportSafeArea = (
    viewport?: HTMLElement | null,
    occluders: Array<HTMLElement | null | undefined> = [],
): ViewportSafeArea => {
    const windowWidth = window.innerWidth || document.documentElement?.clientWidth || 0;
    const windowHeight = window.innerHeight || document.documentElement?.clientHeight || 0;

    return measureViewportSafeArea({
        windowWidth,
        windowHeight,
        rect: viewport?.getBoundingClientRect(),
        occluders: occluders.map(occluder => occluder?.getBoundingClientRect()),
    });
};