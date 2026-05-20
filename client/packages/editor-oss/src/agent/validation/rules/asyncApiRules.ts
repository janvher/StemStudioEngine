import type {ValidationIssue} from "../types";

const PROMISE_METHOD_PATTERNS = [
    {name: "createTexture", pattern: /\.createTexture\s*\(/},
    {name: "createInstance", pattern: /\.createInstance\s*\(/},
    {name: "getUrl", pattern: /\.getUrl\s*\(/},
    {name: "findByName", pattern: /\.findByName\s*\(/},
    {name: "preload", pattern: /\.preload\s*\(/},
    {name: "createFromUrl", pattern: /\.createFromUrl\s*\(/},
    {name: "erth.scene.addObject", pattern: /erth\.scene\.addObject\s*\(/},
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
        source: "async-api",
    };
}

/**
 *
 * @param code
 */
export function checkAsyncApiUsage(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seen = new Set<string>();
    const lines = code.split("\n");

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index] ?? "";
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
        if (/\/\/\s*@check-ok/.test(trimmed)) continue;

        for (const method of PROMISE_METHOD_PATTERNS) {
            const match = method.pattern.exec(line);
            if (!match) continue;

            const context = lines.slice(index, Math.min(index + 8, lines.length)).join("\n");
            const hasAwait = /\bawait\s+/.test(line);
            const hasThen = /\.then\s*\(/.test(context);
            const hasReturn = /^\s*return\b/.test(line);
            const hasPromiseAll = /Promise\.(?:all|allSettled|race|any)\s*\(/.test(line);
            let hasFollowupConsumption = false;

            const assignmentMatch = line.match(/^\s*(?:let|const|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*/);
            if (assignmentMatch?.[1]) {
                const varName = assignmentMatch[1];
                const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const lookahead = lines.slice(index + 1, Math.min(index + 25, lines.length)).join("\n");
                const varThen = new RegExp(`\\b${escapedVarName}\\s*\\.then\\s*\\(`);
                const varAwait = new RegExp(`\\bawait\\s+${escapedVarName}\\b`);
                const varPromiseGroup = new RegExp(
                    `\\bPromise\\.(?:all|allSettled|race|any)\\s*\\([^\\)]*\\b${escapedVarName}\\b`,
                );
                hasFollowupConsumption = varThen.test(lookahead) || varAwait.test(lookahead) || varPromiseGroup.test(lookahead);
            }

            if (hasAwait || hasThen || hasReturn || hasPromiseAll || hasFollowupConsumption) continue;

            const message = `\`${method.name}()\` returns a Promise — use \`await\` or \`.then()\` to avoid race conditions`;
            const key = `${index + 1}:${match.index}:${message}`;
            if (seen.has(key)) continue;
            seen.add(key);

            issues.push(buildIssue(index + 1, match.index + 1, message));
        }
    }

    return issues;
}
