import {checkAntiPatterns} from "./rules/antiPatternRules";
import {checkHallucinatedApis} from "./rules/apiSchemaRules";
import {checkAsyncApiUsage} from "./rules/asyncApiRules";
import {checkLambdaPatterns} from "./rules/lambdaRules";
import {checkLifecycleSignatures} from "./rules/lifecycleRules";
import type {ValidationIssue, ValidationResult} from "./types";

export type BehaviorType = "behavior" | "lambda";

/**
 *
 * @param issues
 */
function dedupeIssues(issues: ValidationIssue[]): ValidationIssue[] {
    const seen = new Set<string>();
    const deduped: ValidationIssue[] = [];

    for (const issue of issues) {
        const key = [issue.line, issue.column || "", issue.severity, issue.source, issue.message].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(issue);
    }

    return deduped.sort((left, right) => {
        if (left.line !== right.line) return left.line - right.line;
        if ((left.column || 0) !== (right.column || 0)) return (left.column || 0) - (right.column || 0);
        if (left.severity !== right.severity) return left.severity.localeCompare(right.severity);
        return left.message.localeCompare(right.message);
    });
}

export class BehaviorCodeValidator {
    validate(code: string, type: BehaviorType = "behavior"): ValidationResult {
        const issues: ValidationIssue[] = [];

        issues.push(...checkAntiPatterns(code));

        if (type === "behavior") {
            issues.push(...checkLifecycleSignatures(code));
        }

        issues.push(...checkAsyncApiUsage(code));
        issues.push(...checkHallucinatedApis(code));

        if (type === "lambda") {
            issues.push(...checkLambdaPatterns(code));
        }

        const dedupedIssues = dedupeIssues(issues);
        const errorCount = dedupedIssues.filter(issue => issue.severity === "error").length;
        const warningCount = dedupedIssues.filter(issue => issue.severity === "warn").length;
        const infoCount = dedupedIssues.filter(issue => issue.severity === "info").length;

        return {
            valid: errorCount === 0,
            issues: dedupedIssues,
            errorCount,
            warningCount,
            infoCount,
        };
    }
}
