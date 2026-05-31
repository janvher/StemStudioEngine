/**
 * Monaco CompletionItemProvider for behavior & lambda scripts.
 * Provides context-aware autocomplete for lifecycle methods, instance
 * properties, available globals, and project behavior/lambda IDs.
 */

import global from "@stem/editor-oss/global";

export type ScriptType = "behavior" | "lambda";

type MonacoType = any;
type DisposableType = { dispose: () => void };

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface LifecycleMethod {
    name: string;
    params: string;
    doc: string;
}

const BEHAVIOR_LIFECYCLE: LifecycleMethod[] = [
    {name: "init", params: "", doc: "Called once when the behavior is initialised."},
    {name: "update", params: "deltaTime", doc: "Called every frame. deltaTime is seconds since last frame."},
    {name: "dispose", params: "", doc: "Called when the behavior is removed. Clean up resources here."},
    {name: "onStart", params: "", doc: "Called when the scene starts playing."},
    {name: "onStop", params: "", doc: "Called when the scene stops playing."},
    {name: "onReset", params: "", doc: "Called when the scene is reset."},
    {name: "onPaused", params: "", doc: "Called when the scene is paused."},
    {name: "onResumed", params: "", doc: "Called when the scene is resumed."},
    {name: "onEvent", params: "event", doc: "Called when an event is received via EventBus."},
    {name: "onAttributesUpdated", params: "", doc: "Called when behavior attributes change."},
];

const LAMBDA_LIFECYCLE: LifecycleMethod[] = [
    {name: "init", params: "", doc: "Called once when the lambda is initialised."},
    {name: "update", params: "deltaTime", doc: "Called every frame. deltaTime is seconds since last frame."},
    {name: "dispose", params: "", doc: "Called when the lambda is removed. Clean up resources here."},
    {name: "onObjectAdded", params: "object", doc: "Called when a matching object is added to the scene."},
    {name: "onObjectRemoved", params: "object", doc: "Called when a matching object is removed from the scene."},
    {name: "onEvent", params: "event", doc: "Called when an event is received via EventBus."},
];

interface PropItem {
    name: string;
    doc: string;
}

const BEHAVIOR_PROPS: PropItem[] = [
    {name: "target", doc: "The 3D object this behavior is attached to."},
    {name: "attributes", doc: "Custom attributes defined in the behavior config. Foreign behavior instances expose this as read-only."},
    {name: "isPaused", doc: "Whether the behavior is currently paused."},
    {name: "id", doc: "Unique identifier of this behavior instance."},
    {name: "uuid", doc: "UUID of this behavior instance."},
];

const LAMBDA_PROPS: PropItem[] = [
    {name: "_registeredObjects", doc: "Set of 3D objects registered with this lambda."},
    {name: "attributes", doc: "Custom attributes defined in the lambda config. Foreign lambda instances expose this as read-only."},
    {name: "_game", doc: "Reference to the game/scene manager."},
];

interface GlobalItem {
    name: string;
    doc: string;
}

const BEHAVIOR_GLOBALS: GlobalItem[] = [
    {name: "THREE", doc: "Three.js library namespace."},
    {name: "EventBus", doc: "Global event bus for inter-behavior communication."},
    {name: "Ammo", doc: "Ammo.js (Bullet) physics library."},
    {name: "CSS3DObject", doc: "Three.js CSS 3D Object."},
    {name: "CSS3DSprite", doc: "Three.js CSS 3D Sprite."},
    {name: "UIKit", doc: "UI toolkit for in-scene UI elements."},
    {name: "UIKitPointerEvents", doc: "Pointer event constants for UIKit."},
    {name: "CesiumTool", doc: "Lazy Cesium loader and viewer helpers."},
];

const LAMBDA_GLOBALS: GlobalItem[] = [
    {name: "THREE", doc: "Three.js library namespace."},
    {name: "CesiumTool", doc: "Lazy Cesium loader and viewer helpers."},
];

// ---------------------------------------------------------------------------
// Project-aware ID suggestions (behavior / lambda IDs from registries)
// ---------------------------------------------------------------------------

const LAMBDA_ID_METHODS = new Set([
    "getInstancesByType", "createInstance", "hasLambdaClass",
    "getConfig", "updateConfig",
]);

const BEHAVIOR_ID_METHODS = new Set([
    "getBehaviorsById", "getTargetBehaviorsById", "createBehavior",
    "hasBehaviorClass", "destroyBehaviorFromObjectById",
]);

/**
 * Detect if cursor is inside a string arg of a known manager method.
 * @param textUntilPosition
 */
function detectMethodCallContext(
    textUntilPosition: string,
): {kind: "lambda" | "behavior"} | null {
    // Match: methodName( ... possibly other args ... open-quote ... partial-string
    const match = textUntilPosition.match(/(\w+)\s*\([^)]*["'][^"']*$/);
    if (!match?.[1]) return null;
    const methodName = match[1];
    if (LAMBDA_ID_METHODS.has(methodName)) return {kind: "lambda"};
    if (BEHAVIOR_ID_METHODS.has(methodName)) return {kind: "behavior"};
    return null;
}

/**
 *
 */
function getLambdaIds(): {id: string; name: string}[] {
    const configs = global.app?.editor?.lambdaConfigRegistry?.getAllConfigs() || [];
    return configs.map(c => ({id: c.id, name: c.name}));
}

/**
 *
 */
function getBehaviorIds(): {id: string; name: string}[] {
    const configs = global.app?.editor?.behaviorConfigRegistry?.getAllConfigs() || [];
    return configs.map(c => ({id: c.id, name: c.name}));
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 *
 * @param monaco
 * @param scriptType
 */
export function registerScriptCompletions(
    monaco: MonacoType,
    scriptType: ScriptType,
): DisposableType {
    const lifecycle = scriptType === "behavior" ? BEHAVIOR_LIFECYCLE : LAMBDA_LIFECYCLE;
    const props = scriptType === "behavior" ? BEHAVIOR_PROPS : LAMBDA_PROPS;
    const globals = scriptType === "behavior" ? BEHAVIOR_GLOBALS : LAMBDA_GLOBALS;

    return monaco.languages.registerCompletionItemProvider("javascript", {
        triggerCharacters: [".", '"', "'", "@"],
        provideCompletionItems(model: any, position: any) {
            const textUntilPosition = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endLineNumber: position.lineNumber,
                endColumn: word.endColumn,
            };

            // Inside a string arg of a known API method → suggest project IDs
            const methodCtx = detectMethodCallContext(textUntilPosition);
            if (methodCtx) {
                const items = methodCtx.kind === "lambda" ? getLambdaIds() : getBehaviorIds();
                // Range covers text already typed inside the quote
                const lastQuote = Math.max(
                    textUntilPosition.lastIndexOf('"'),
                    textUntilPosition.lastIndexOf("'"),
                );
                const idRange = {
                    startLineNumber: position.lineNumber,
                    startColumn: lastQuote + 2, // +1 for 0-index, +1 to skip the quote char
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                };
                return {
                    suggestions: items.map(item => ({
                        label: item.id,
                        kind: monaco.languages.CompletionItemKind.Value,
                        detail: item.name,
                        documentation: `${methodCtx.kind === "lambda" ? "Lambda" : "Behavior"} ID: ${item.id}`,
                        insertText: item.id,
                        range: idRange,
                    })),
                };
            }

            const suggestions: any[] = [];

            if (/@\w*$/.test(textUntilPosition) || /^\s*@import\s+["'][^"']*$/.test(textUntilPosition)) {
                suggestions.push({
                    label: "@import",
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    documentation: 'Import a shared helper module by scene name or asset ID, e.g. `@import "math" as math`.',
                    insertText: '@import "${1:import-module-name-or-id}" as ${2:alias}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range,
                });
            }

            // After "this." → instance properties + lifecycle methods
            if (/this\.\s*$/.test(textUntilPosition)) {
                for (const p of props) {
                    suggestions.push({
                        label: p.name,
                        kind: monaco.languages.CompletionItemKind.Property,
                        documentation: p.doc,
                        insertText: p.name,
                        range,
                    });
                }
                return {suggestions};
            }

            // After "function " → lifecycle method name snippets
            if (/function\s+$/.test(textUntilPosition)) {
                for (const m of lifecycle) {
                    suggestions.push({
                        label: m.name,
                        kind: monaco.languages.CompletionItemKind.Function,
                        documentation: m.doc,
                        insertText: `${m.name}(${m.params}) {\n\t$0\n}`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                    });
                }
                return {suggestions};
            }

            // General → globals + lifecycle function names. Only offer these
            // when the cursor is actually on a word being typed. Without this
            // guard the provider returns the full list for *any* position,
            // including right after a space, so the suggest widget pops up (or
            // refuses to dismiss) every time you type a space — most visibly on
            // the first line of top-level code. An empty word means "not typing
            // an identifier", so return whatever context-specific suggestions we
            // already collected (e.g. @import) and nothing else.
            if (!word.word) {
                return {suggestions};
            }

            for (const g of globals) {
                suggestions.push({
                    label: g.name,
                    kind: monaco.languages.CompletionItemKind.Variable,
                    documentation: g.doc,
                    insertText: g.name,
                    range,
                });
            }

            for (const m of lifecycle) {
                suggestions.push({
                    label: m.name,
                    kind: monaco.languages.CompletionItemKind.Function,
                    documentation: m.doc,
                    insertText: m.name,
                    range,
                });
            }

            return {suggestions};
        },
    });
}
