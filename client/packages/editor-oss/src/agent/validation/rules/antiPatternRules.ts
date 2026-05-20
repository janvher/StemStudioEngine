import type {AntiPatternRule, IssueSeverity, ValidationIssue} from "../types";

const ANTI_PATTERNS: AntiPatternRule[] = [
    {
        pattern: /\bvar\s+[A-Za-z_$]/g,
        message: "Use `let`/`const`, not `var`, in generated behavior/lambda code",
    },
    {
        pattern: /this\.config\.attributes/g,
        message: "Use `this.attributes` (not `this.config.attributes`) — config is the YAML schema, not the runtime values",
    },
    {
        pattern: /this\.game\.THREE\b/g,
        message: "Use `THREE` directly (not `this.game.THREE`) — THREE is an injected global",
    },
    {
        pattern: /this\.THREE\b/g,
        message: "Use `THREE` directly (not `this.THREE`) — THREE is injected as a function parameter, not a property on `this`",
    },
    {
        pattern: /new\s+THREE\s*\.\s*ShaderMaterial\b/g,
        message: "THREE.ShaderMaterial is NOT WebGPU-compatible — replace with NodeMaterial + TSL nodes",
    },
    {
        pattern: /new\s+THREE\s*\.\s*RawShaderMaterial\b/g,
        message: "THREE.RawShaderMaterial is NOT WebGPU-compatible — replace with NodeMaterial + TSL nodes",
    },
    {
        pattern: /this\.game\s*=\s*(?:game|_game)\s*;/g,
        message: "Prefer closure variable: declare `let game;` at behavior scope, then `game = _game;` in init. Avoids polluting the behavior instance with `this.game`",
        severity: "info",
    },
    {
        pattern: /\bself\s*=\s*this\b/g,
        message: "Do not use `self = this` — capture needed properties via closure variables at behavior scope instead",
        severity: "info",
    },
    {
        pattern: /\bfunction\s+\w+\s*\(\s*self\b/g,
        message: "Do not pass `this` as a `self` parameter to helpers — capture `this.erth` or `this.attributes` via closure variables instead",
        severity: "info",
    },
    {
        pattern: /self\.game\b/g,
        message: "Replace `self.game` with closure variable `game` — declare `let game;` at behavior scope, assign `game = _game;` in init",
        severity: "info",
    },
    {
        pattern: /self\.erth\b/g,
        message: "Replace `self.erth` with closure variable `erth` — declare `let erth;` at behavior scope, assign `erth = this.erth;` in init",
        severity: "info",
    },
    {
        pattern: /self\.target\b/g,
        message: "Replace `self.target` with closure variable `target` — declare `let target;` at behavior scope, assign `target = this.target;` in init",
        severity: "info",
    },
    {
        pattern: /\bself\._/g,
        message: "Replace `self._xxx` with a closure variable — `self` is never assigned. Declare `let _xxx` at scope and reference it directly",
        severity: "info",
        skipLineMatch: /@check-ok/,
    },
    {
        pattern: /\bself\.getAttribute\b/g,
        message: "Replace `self.getAttribute(...)` with `this.getAttribute(...)` inside methods, or capture the value as a closure variable in `init()`",
        severity: "info",
    },
    {
        pattern: /\bself\./g,
        message: "Avoid `self.*` access in generated scripts — use closure variables or `this.*` inside lifecycle methods",
        severity: "info",
    },
    {
        pattern: /\bself\.sendEvent\b/g,
        message: "Replace `self.sendEvent(...)` with `this.sendEvent(...)` — use `this` inside lifecycle methods",
        severity: "info",
    },
    {
        pattern: /new\s+THREE\s*\.\s*(?:MeshBasicMaterial|MeshStandardMaterial|MeshPhongMaterial|MeshLambertMaterial|PointsMaterial|SpriteMaterial|LineBasicMaterial|LineDashedMaterial)\b(?!Node)/g,
        message: "Use *NodeMaterial variant — legacy material classes are NOT WebGPU-compatible",
    },
    {
        pattern: /erth\.scene\.addObject\b/g,
        message: "`erth.scene.addObject()` returns a Promise — always use `await erth.scene.addObject(...)` and ensure the enclosing function is `async`",
        skipLineMatch: /\bawait\b/,
    },
    {
        pattern: /\bgame\.scene\.add\b/g,
        message: "Use `game.addObject(obj, parent)` instead of `game.scene.add(obj)`",
    },
    {
        pattern: /\bgame\.scene\.remove\b/g,
        message: "Use `game.removeObject(obj)` instead of `game.scene.remove(obj)` and dispose geometry/materials",
    },
    {
        pattern: /this\.game\s*=\s*agent\.game/g,
        message: "Do not use `this.game = agent.game` — the `(agent, config)` init signature does not exist. Use `let game;` at scope and `game = _game;` in `init(_game)`",
    },
    {
        pattern: /this\.findBehaviors\s*\(/g,
        message: "Use `this.erth.behaviors.findAll(id)` instead of `this.findBehaviors(id)`",
    },
    {
        pattern: /this\.findBehavior\s*\(/g,
        message: "Use `this.erth.behaviors.find(target, id)` instead of `this.findBehavior(id, target)`",
    },
    {
        pattern: /this\.cam\s*=\s*this\.target\b/g,
        message: "Do not use `this.cam = this.target` for camera access — use `game.camera` instead",
    },
    {
        pattern: /this\.camera\s*=\s*this\.target\b/g,
        message: "Do not use `this.camera = this.target` for camera access — use `game.camera` instead",
    },
    {
        pattern: /this\.init\s*=\s*function\s*\(\s*game\s*\)/g,
        message: "Rename init parameter to `_game` to avoid shadowing the closure variable `game`",
        severity: "info",
    },
    {
        pattern: /(?<!\w\.)target\.add\s*\(/g,
        message: "Use `this.target.add()` instead of bare `target.add()` — the closure variable `target` is undefined in editor callbacks",
        severity: "info",
    },
    {
        pattern: /game\.findObjectByName\s*\(/g,
        message: "`game.findObjectByName()` does not exist. For the camera use `game.camera`; for the attached object use `this.target`",
    },
    {
        pattern: /\b(?:instance|gameObject|gobj|go)\s*\.traverse\s*\(/g,
        message: "`createInstance()` returns GameObject, not Object3D. Use `instance._internal.three.traverse(...)`",
    },
    {
        pattern: /document\.getElementById\s*\(/g,
        message: "Avoid direct DOM lookups (`document.getElementById`) in behaviors",
        severity: "info",
        skipLineMatch: /@check-ok/,
    },
    {
        pattern: /document\.querySelector(?:All)?\s*\(/g,
        message: "Avoid direct DOM queries (`document.querySelector*`) in behaviors",
        severity: "info",
        skipLineMatch: /@check-ok/,
    },
    {
        pattern: /document\.addEventListener\s*\(/g,
        message: "Avoid broad `document.addEventListener(...)` wiring in behaviors — prefer InputManager, behavior events, or scoped element handlers",
        severity: "info",
        skipLineMatch: /keydown|keyup|mousedown|mouseup|pointerdown|pointerup|@check-ok/,
    },
    {
        pattern: /\.\s*style\.[A-Za-z_$][\w$]*\s*=/g,
        message: "Avoid direct DOM style mutation in behaviors — use UIKit properties instead",
        severity: "info",
        skipLineMatch: /material\.style|@check-ok/,
    },
    {
        pattern: /\bapp\.call\s*\(/g,
        message: "Avoid direct `app.call(...)` in generated behaviors — use lifecycle hooks, engine APIs, and behavior events instead",
        severity: "warn",
        skipLineMatch: /@check-ok/,
    },
    {
        pattern: /\bEventBus\.send\s*\(/g,
        message: "Deprecated API `EventBus.send()` is not allowed — use `game.behaviorManager.sendEventToObjectBehaviors(target, msg, data)` and receiver `this.onEvent(msg, data)`",
        severity: "error",
        skipLineMatch: /@check-ok/,
    },
    {
        pattern: /fetch\s*\(\s*["'`]https?:\/\/(?!localhost)/g,
        message: "Do not hardcode external API URLs — route through `/.proxy/<suffix>/` with configurable proxy attributes",
        skipLineMatch: /@check-ok/,
    },
];

/**
 *
 * @param line
 * @param column
 * @param message
 * @param severity
 */
function buildIssue(
    line: number,
    column: number | undefined,
    message: string,
    severity: IssueSeverity,
): ValidationIssue {
    return {
        line,
        column,
        message,
        severity,
        source: "anti-pattern",
    };
}

/**
 *
 * @param code
 */
export function checkAntiPatterns(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seen = new Set<string>();
    const lines = code.split("\n");

    for (const rule of ANTI_PATTERNS) {
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index] ?? "";
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
            if (/\/\/\s*@check-ok/.test(trimmed)) continue;

            rule.pattern.lastIndex = 0;
            const match = rule.pattern.exec(line);
            if (!match) continue;

            if (rule.skipLineMatch) {
                rule.skipLineMatch.lastIndex = 0;
                if (rule.skipLineMatch.test(trimmed)) continue;
            }

            const key = `${index + 1}:${match.index}:${rule.severity || "warn"}:${rule.message}`;
            if (seen.has(key)) continue;
            seen.add(key);

            issues.push(buildIssue(index + 1, match.index + 1, rule.message, rule.severity || "warn"));
        }
    }

    return issues;
}
