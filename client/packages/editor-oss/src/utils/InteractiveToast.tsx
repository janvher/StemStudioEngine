import {toast, ToastOptions} from "toastywave";

/**
 * Configuration for a clickable item in the toast
 */
export interface ToastClickableItem {
    /** Display text for the clickable item */
    text: string;
    /** Callback function when item is clicked */
    onClick: () => void;
    /** Optional icon or emoji to show before text */
    icon?: string;
    /** Optional tooltip text */
    tooltip?: string;
}

/**
 * Props for interactive toast message
 */
export interface InteractiveToastProps {
    /** Toast title */
    title?: string;
    /** Main body text */
    body?: string;
    /** List of clickable items */
    clickableItems?: ToastClickableItem[];
    /** Toast type */
    type?: "success" | "error" | "warning" | "info" | "default";
    /** Duration in milliseconds */
    duration?: number;
}

/**
 * Show an interactive toast with clickable items
 *
 * @param root0
 * @param root0.title
 * @param root0.body
 * @param root0.clickableItems
 * @param root0.type
 * @param root0.duration
 * @example
 * ```tsx
 * showInteractiveToast({
 *     type: "warning",
 *     title: "Large Textures Found",
 *     body: "Click on objects to select them in the editor",
 *     clickableItems: [
 *         {
 *             text: "Character Model - Diffuse (4096x4096)",
 *             icon: "🖼️",
 *             onClick: () => editor.selectByUuid(objectUuid),
 *             tooltip: "Click to select this object"
 *         }
 *     ]
 * });
 * ```
 */
const DEFAULT_DURATION = 2500; // 2.5 seconds auto-dismiss

/**
 *
 * @param root0
 * @param root0.title
 * @param root0.body
 * @param root0.clickableItems
 * @param root0.type
 * @param root0.duration
 */
export function showInteractiveToast({
    title,
    body,
    clickableItems,
    type = "default",
    duration = DEFAULT_DURATION,
}: InteractiveToastProps): void {
    const defaultTitles: Record<string, string> = {
        success: "Success!",
        error: "Error!",
        warning: "Warning!",
        info: "Info",
        default: "Notification",
    };

    const finalTitle: string = title ?? defaultTitles[type] ?? defaultTitles.default ?? "Notification";

    // Build description including clickable items text if present
    let description = body || "";
    if (clickableItems && clickableItems.length > 0) {
        const itemsText = clickableItems.map(item =>
            item.icon ? `${item.icon} ${item.text}` : item.text,
        ).join("\n");
        description = description ? `${description}\n\n${itemsText}` : itemsText;

        // If there's only one clickable item, use it as an action button
        if (clickableItems.length === 1) {
            const item = clickableItems[0];
            if (!item) return;
            toast(finalTitle, {
                type: type === "default" ? undefined : type,
                description,
                showCountdown: false,
                duration,
                action: {
                    label: item.text,
                    onClick: item.onClick,
                },
            });
            return;
        }
    }

    const options: ToastOptions = {
        type: type === "default" ? undefined : type,
        description: description || undefined,
        showCountdown: false,
        duration,
    };

    toast(finalTitle, options);
}

/**
 * Utility function to create clickable items for objects in the scene
 *
 * @param items
 * @param getText
 * @param onClick
 * @param getIcon
 * @param getTooltip
 * @example
 * ```tsx
 * const items = createObjectClickableItems(
 *     largeTextures,
 *     (texture) => texture.objectName,
 *     (texture) => editor.selectObjectByName(texture.objectName)
 * );
 * ```
 */
export function createClickableItems<T>(
    items: T[],
    getText: (item: T) => string,
    onClick: (item: T) => void,
    getIcon?: (item: T) => string,
    getTooltip?: (item: T) => string,
): ToastClickableItem[] {
    return items.map(item => ({
        text: getText(item),
        onClick: () => onClick(item),
        icon: getIcon ? getIcon(item) : undefined,
        tooltip: getTooltip ? getTooltip(item) : undefined,
    }));
}
