import type {ValidationIssue} from "../types";

const DEPRECATED_HOOKS = [
    {pattern: /this\.onAdded\s*=\s*function\b/, oldName: "onAdded", replacement: "onStart"},
    {pattern: /this\.onRemoved\s*=\s*function\b/, oldName: "onRemoved", replacement: "onStop"},
    {pattern: /^\s*function\s+onAdded\s*\(/, oldName: "onAdded", replacement: "onStart"},
    {pattern: /^\s*function\s+onRemoved\s*\(/, oldName: "onRemoved", replacement: "onStop"},
];

const PLAIN_HOOK_RULES = [
    {name: "init", signature: "this.init = function(_game) { ... }"},
    {name: "update", signature: "this.update = function(deltaTime) { ... }"},
    {name: "fixedUpdate", signature: "this.fixedUpdate = function(fixedDeltaTime) { ... }"},
    {name: "dispose", signature: "this.dispose = function() { ... }"},
    {name: "onEvent", signature: "this.onEvent = function(msg, data) { ... }"},
    {name: "onStart", signature: "this.onStart = function() { ... }"},
    {name: "onStop", signature: "this.onStop = function() { ... }"},
];

/**
 *
 * @param line
 * @param column
 * @param message
 */
function buildIssue(line: number, column: number | undefined, message: string): ValidationIssue {
    return {
        line,
        column,
        message,
        severity: "warn",
        source: "lifecycle",
    };
}

/**
 *
 * @param code
 */
export function checkLifecycleSignatures(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seen = new Set<string>();
    const lines = code.split("\n");

    for (const rule of DEPRECATED_HOOKS) {
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index] ?? "";
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

            rule.pattern.lastIndex = 0;
            const match = rule.pattern.exec(line);
            if (!match) continue;

            const message = `Deprecated lifecycle hook \`${rule.oldName}\` is not allowed — use \`${rule.replacement}\` instead`;
            const key = `${index + 1}:${match.index}:${message}`;
            if (seen.has(key)) continue;
            seen.add(key);

            issues.push(buildIssue(index + 1, match.index + 1, message));
        }
    }

    const initNoParamRe = /this\.init\s*=\s*function\s*\(\s*\)/;
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index] ?? "";
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

        const match = initNoParamRe.exec(line);
        if (!match) continue;

        const message = "init() must receive `_game`: `this.init = function(_game) { game = _game; ... }`";
        const key = `${index + 1}:${match.index}:${message}`;
        if (seen.has(key)) continue;
        seen.add(key);

        issues.push(buildIssue(index + 1, match.index + 1, message));
    }

    const initAgentConfigRe = /this\.init\s*=\s*function\s*\(\s*agent\b/;
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index] ?? "";
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

        const match = initAgentConfigRe.exec(line);
        if (!match) continue;

        const message = "Wrong init signature `init(agent, ...)` — init receives a single `_game` parameter, not `(agent, config)`";
        const key = `${index + 1}:${match.index}:${message}`;
        if (seen.has(key)) continue;
        seen.add(key);

        issues.push(buildIssue(index + 1, match.index + 1, message));
    }

    const usesThisGame = /this\.game\./;
    const assignsThisGame = /this\.game\s*=\s*/;
    const assignsClosureGame = /^\s*game\s*=\s*_game\s*;/;
    let usesGame = false;
    let assignsGameOld = false;
    let assignsGameNew = false;
    let firstGameUsageLine = -1;

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index] ?? "";
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

        if (assignsThisGame.test(line)) assignsGameOld = true;
        if (assignsClosureGame.test(line)) assignsGameNew = true;
        if (usesThisGame.test(line) && firstGameUsageLine === -1) {
            firstGameUsageLine = index;
            usesGame = true;
        }
    }

    if (usesGame && !assignsGameOld && !assignsGameNew) {
        const message = "`this.game` is used but never assigned — use `let game;` at behavior scope and `game = _game;` in init";
        const line = lines[firstGameUsageLine] ?? "";
        const match = usesThisGame.exec(line);
        const key = `${firstGameUsageLine + 1}:${match?.index || 0}:${message}`;
        if (!seen.has(key)) {
            seen.add(key);
            issues.push(buildIssue(firstGameUsageLine + 1, match ? match.index + 1 : undefined, message));
        }
    }

    for (const rule of PLAIN_HOOK_RULES) {
        const re = new RegExp(`^\\s*function\\s+${rule.name}\\s*\\(`);
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index] ?? "";
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

            const match = re.exec(line);
            if (!match) continue;

            const message = `Behavior hook declared as plain function \`${rule.name}()\` — use \`${rule.signature}\` instead`;
            const key = `${index + 1}:${match.index}:${message}`;
            if (seen.has(key)) continue;
            seen.add(key);

            issues.push(buildIssue(index + 1, match.index + 1, message));
        }
    }

    return issues;
}
