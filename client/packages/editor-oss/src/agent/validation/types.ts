export type IssueSeverity = "error" | "warn" | "info";

export interface ValidationIssue {
    line: number;
    column?: number;
    message: string;
    severity: IssueSeverity;
    source: string;
}

export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
    errorCount: number;
    warningCount: number;
    infoCount: number;
}

export interface AntiPatternRule {
    pattern: RegExp;
    message: string;
    severity?: IssueSeverity;
    skipLineMatch?: RegExp;
}
