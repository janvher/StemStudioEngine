import React from "react";

import EngineRuntime from "../EngineRuntime";
import global from "../global";
import TimeUtils from "./TimeUtils";
import i18n from "@stem/editor-oss/i18n/config";
import {Confirm, Photo, Prompt, Video} from "../ui/index";


const {t} = i18n;

/**
 * Creates a React element.
 * @param type
 * @param props
 * @param children
 */
export function createElement(
    type: React.ComponentType<any>,
    props: Record<string, unknown>,
    children: React.ReactNode,
): React.ReactElement | undefined {
    return global.app?.editor?.component?.createElement(type, props, children);
}

/**
 * Adds a React element to the application.
 * @param element
 */
export function addElement(element: React.ReactElement): void {
    if (global.app?.editor) global.app.editor.component?.addElement(element, () => {});
}

/**
 * Removes a React element from the application.
 * @param element
 */
export function removeElement(element: React.ReactElement): void {
    if (global.app?.editor) global.app.editor.component?.removeElement(element, () => {});
}

/**
 * Shows a confirmation dialog.
 * @param options
 * @param options.title
 * @param options.content
 * @param options.okText
 * @param options.cancelText
 * @param options.className
 * @param options.style
 * @param options.onOK
 * @param options.onCancel
 * @param options.onClose
 */
export function confirm(
    options: {
        title?: string;
        content?: string;
        okText?: string;
        cancelText?: string;
        className?: string;
        style?: React.CSSProperties;
        onOK?: () => void;
        onCancel?: () => void;
        onClose?: () => void;
    } = {},
): {component?: React.ReactElement; close: () => void} {
    const {title, content, okText, cancelText, className, style, onOK, onCancel, onClose} = options;

    let component: React.ReactElement | undefined;

    let close = () => {
        if (component) removeElement(component);
    };

    let handleOK = () => {
        if (onOK) {
            onOK();
            close();
        }
    };

    let handleCancel = () => {
        if (onCancel) onCancel();
        close();
    };

    let handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            if (onCancel) onCancel();
        }
        close();
    };

    component = createElement(
        Confirm,
        {
            title,
            okText: okText || t("Confirm"),
            cancelText: cancelText || t("Cancel"),
            className,
            style,
            onOK: handleOK,
            onCancel: handleCancel,
            onClose: handleClose,
        },
        content,
    );
    if (component) {
        addElement(component);
    }

    return {
        component,
        close,
    };
}

/**
 * Shows a prompt dialog.
 * @param options
 * @param options.title
 * @param options.content
 * @param options.className
 * @param options.style
 * @param options.value
 * @param options.mask
 * @param options.onOK
 * @param options.onClose
 */
export function prompt(
    options: {
        title?: string;
        content?: string;
        className?: string;
        style?: React.CSSProperties;
        value?: string;
        mask?: boolean;
        onOK?: (value: string) => void;
        onClose?: () => void;
    } = {},
): {component?: React.ReactElement; close: () => void} {
    let {title, content, className, style, value, mask, onOK, onClose} = options;
    let component: React.ReactElement | undefined;

    let close = () => {
        if (component) removeElement(component);
    };

    let handleOK = (newValue: string) => {
        if (onOK && newValue) {
            onOK(newValue);
            close();
        }
    };

    let handleClose = () => {
        if (onClose) onClose();
        close();
    };

    component = createElement(
        Prompt,
        {
            title,
            content,
            className,
            style,
            value,
            okText: t("OK"),
            mask,
            onOK: handleOK,
            onClose: handleClose,
        },
        null,
    );

    if (component) {
        addElement(component);
    }

    return {
        component,
        close,
    };
}

/**
 * Shows an image viewer.
 * @param url
 */
export function photo(url: string): void {
    let component: React.ReactElement | undefined;

    let close = () => {
        if (component) {
            removeElement(component);
            component = undefined;
        }
    };

    component = createElement(
        Photo,
        {
            url,
            onClick: close,
        },
        null,
    );

    if (component) {
        addElement(component);
    }
}

/**
 * Shows a video player.
 * @param url
 */
export function video(url: string): void {
    let component: React.ReactElement | undefined;

    let close = () => {
        if (component) {
            removeElement(component);
            component = undefined;
        }
    };

    component = createElement(
        Video,
        {
            url,
            onClick: close,
        },
        null,
    );

    if (component) {
        addElement(component);
    }
}

/**
 *
 */
function queryBeforeCreateScene() {
    return new Promise<void>(resolve => {
        if (global.app?.editor?.sceneID === null) {
            resolve();
        } else {
            confirm({
                title: "Confirm",
                content: "All unsaved data will be lost. Are you sure?",
                onOK: () => {
                    resolve();
                },
            });
        }
    });
}

/**
 *
 * @param args
 * @param args.onCancel
 */
function querySceneName(args: {onCancel: () => void}): Promise<string | undefined> {
    const app = global.app as EngineRuntime | null | undefined;
    const sceneName = app?.editor?.sceneName || i18n.t(`Scene{{Time}}`, {Time: TimeUtils.getDateTime()});

    return new Promise(resolve => {
        if (!global.app) {
            resolve(undefined);
            return;
        }

        prompt({
            title: i18n.t("Input File Name"),
            content: i18n.t("Name"),
            value: sceneName || undefined,
            onOK: (name: string) => {
                resolve(name);
            },
            onClose: args.onCancel,
        });
    });
}

export const ElementsUtils = {
    createElement,
    addElement,
    removeElement,
    confirm,
    prompt,
    photo,
    video,
    queryBeforeCreateScene,
    querySceneName,
};
