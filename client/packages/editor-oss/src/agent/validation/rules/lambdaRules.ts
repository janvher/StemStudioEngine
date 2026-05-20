import type {ValidationIssue} from "../types";

const LAMBDA_RULES = [
    {
        pattern: /\bthis\.erth\b/,
        message: "Lambda code should not use `this.erth` — lambdas access runtime via `this._game` and lambda/component data APIs",
    },
    {
        pattern: /\bthis\.target\b/,
        message: "Lambda code should not access `this.target` — lambdas process many objects via `this.processObjects(...)`",
    },
    {
        pattern: /\bthis\.gameObject\b/,
        message: "Lambda code should not access `this.gameObject` — use the `object` argument from `this.processObjects(...)`",
    },
    {
        pattern: /\bthis\._registeredObjects\b/,
        message: "Avoid direct `this._registeredObjects` iteration — use `this.processObjects(...)` for scheduler-aware processing",
    },
    {
        pattern: /\bthis\.registeredObjects\.(?:forEach|entries|values|keys)\s*\(/,
        message: "Prefer `this.processObjects(...)` over manual `registeredObjects` iteration to preserve throttling/perf behavior",
    },
    {
        pattern: /\bfor\s*\([^)]*\bof\b[^)]*\bthis\.registeredObjects\b/,
        message: "Prefer `this.processObjects(...)` over `for..of this.registeredObjects` for scheduler-aware iteration",
    },
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
        source: "lambda",
    };
}

/**
 *
 * @param code
 */
export function checkLambdaPatterns(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seen = new Set<string>();
    const lines = code.split("\n");

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index] ?? "";
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
        if (/\/\/\s*@check-ok/.test(trimmed)) continue;

        for (const rule of LAMBDA_RULES) {
            const match = rule.pattern.exec(line);
            if (!match) continue;

            const key = `${index + 1}:${match.index}:${rule.message}`;
            if (seen.has(key)) continue;
            seen.add(key);

            issues.push(buildIssue(index + 1, match.index + 1, rule.message));
        }
    }

    return issues;
}
