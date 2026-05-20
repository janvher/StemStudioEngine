import {toast as toastywaveToast, ToastOptions as ToastywaveOptions} from "toastywave";

import {getLogger, LogLevel} from "./utils/Logger";
import {warningService} from "./WarningService/WarningRenderer";

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

type ToastType = "success" | "error" | "warning" | "info" | "default" | "confirmation-warning";

interface StandardToastMessageProps {
    body?: string;
    title?: string;
    type?: Exclude<ToastType, "confirmation-warning">;
    clickableItems?: ToastClickableItem[];
    duration?: number;
}

type ConfirmationWarningToastMessageProps = {
    type: "confirmation-warning";
    title?: string;
    body: string;
    onCancel?: () => void;
    onConfirm?: () => void;
};

export type ToastMessageProps = StandardToastMessageProps | ConfirmationWarningToastMessageProps;

const defaultTitles: Record<string, string> = {
    success: "Success!",
    error: "Error!",
    warning: "Warning!",
    info: "Info",
    default: "Notification",
};

const DEFAULT_DURATION = 2500; // 2.5 seconds auto-dismiss

const showToast = (props: ToastMessageProps) => {
    const clickableItems = "clickableItems" in props ? props.clickableItems : undefined;
    const onCancel = "onCancel" in props ? props.onCancel : undefined;
    const onConfirm = "onConfirm" in props ? props.onConfirm : undefined;
    const duration = "duration" in props ? props.duration : DEFAULT_DURATION;
    const {body, title, type = "default"} = props;

    const finalTitle = title || defaultTitles[type] || defaultTitles.default!;

    if (type === "confirmation-warning") {
        warningService.show({
            title,
            description: body,
            onCancel,
            onConfirm,
        });
        return;
    }

    if (type === "error" || type === "warning") {
        const logLevel = type === "error" ? LogLevel.ERROR : LogLevel.WARN;
        const logMessage = {
            title: finalTitle,
            body: body,
            clickableItems: clickableItems,
            source: "showToast",
        };

        getLogger()?.notifyListeners(logLevel, [logMessage]);
    }

    // Build description including clickable items text if present
    let description = body || "";
    if (clickableItems && clickableItems.length > 0) {
        const itemsText = clickableItems.map(item => (item.icon ? `${item.icon} ${item.text}` : item.text)).join("\n");
        description = description ? `${description}\n\n${itemsText}` : itemsText;

        // Execute the first clickable item's action if there's only one
        if (clickableItems.length === 1) {
            const item = clickableItems[0]!;
            toastywaveToast(finalTitle, {
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

    const options: ToastywaveOptions = {
        type: type === "default" ? undefined : type,
        description: description || undefined,
        showCountdown: false,
        duration,
    };

    toastywaveToast(finalTitle, options);
};

export {showToast};

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
