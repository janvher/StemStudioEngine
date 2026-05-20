import {useEffect} from "react";

import i18n from "./config";

const textNodeOrigins = new WeakMap<Text, string>();
const attributeOrigins = new WeakMap<Element, Map<string, string>>();
const LOCALIZABLE_ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"];
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);

/**
 *
 * @param element
 */
function shouldSkipElement(element: Element | null): boolean {
    let current = element;
    while (current) {
        if (current instanceof HTMLElement && current.dataset.noLocalize === "true") {
            return true;
        }
        if (SKIP_TAGS.has(current.tagName)) {
            return true;
        }
        current = current.parentElement;
    }
    return false;
}

/**
 *
 * @param node
 */
function translateTextNode(node: Text) {
    if (shouldSkipElement(node.parentElement)) {
        return;
    }

    const original = textNodeOrigins.get(node) ?? node.textContent ?? "";
    if (!textNodeOrigins.has(node)) {
        textNodeOrigins.set(node, original);
    }

    const trimmed = original.trim();
    if (!trimmed) {
        return;
    }

    const translated = i18n.t(trimmed, {defaultValue: trimmed});
    if (translated === trimmed && i18n.language === "en") {
        return;
    }

    const leading = original.match(/^\s*/)?.[0] ?? "";
    const trailing = original.match(/\s*$/)?.[0] ?? "";
    node.textContent = `${leading}${translated}${trailing}`;
}

/**
 *
 * @param element
 */
function translateAttributes(element: Element) {
    if (shouldSkipElement(element)) {
        return;
    }

    const stored = attributeOrigins.get(element) ?? new Map<string, string>();
    attributeOrigins.set(element, stored);

    for (const attr of LOCALIZABLE_ATTRIBUTES) {
        const value = element.getAttribute(attr);
        if (!value) continue;

        const original = stored.get(attr) ?? value;
        if (!stored.has(attr)) {
            stored.set(attr, original);
        }

        const translated = i18n.t(original, {defaultValue: original});
        if (translated !== value) {
            element.setAttribute(attr, translated);
        }
    }
}

/**
 *
 * @param root
 */
function localizeSubtree(root: ParentNode) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL);
    let current: Node | null = walker.currentNode;

    while (current) {
        if (current.nodeType === Node.TEXT_NODE) {
            translateTextNode(current as Text);
        } else if (current.nodeType === Node.ELEMENT_NODE) {
            translateAttributes(current as Element);
        }
        current = walker.nextNode();
    }
}

export const LocalizationObserver = () => {
    useEffect(() => {
        const relocalize = () => {
            localizeSubtree(document.body);
        };

        relocalize();

        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
                    translateTextNode(mutation.target as Text);
                    continue;
                }

                if (mutation.type === "attributes" && mutation.target.nodeType === Node.ELEMENT_NODE) {
                    translateAttributes(mutation.target as Element);
                    continue;
                }

                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        translateTextNode(node as Text);
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        localizeSubtree(node as Element);
                    }
                });
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: LOCALIZABLE_ATTRIBUTES,
        });

        i18n.on("languageChanged", relocalize);

        return () => {
            observer.disconnect();
            i18n.off("languageChanged", relocalize);
        };
    }, []);

    return null;
};
