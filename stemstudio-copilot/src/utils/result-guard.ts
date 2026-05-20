/**
 * Tool result size guard adapted from OpenClaw's session-tool-result-guard.ts.
 * Caps oversized JSONRPC responses to prevent context window overflow when
 * the AI agent receives massive scene data.
 *
 * Uses middle truncation: keeps both the start (schema context) and end
 * (recently-created objects) of large results.
 */

const DEFAULT_MAX_RESULT_CHARS = 50_000; // 50KB default

/**
 * Cap an oversized result object by truncating with middle-out strategy.
 * Returns the original result if under the limit.
 */
export function capResultSize(result: unknown, maxChars: number = DEFAULT_MAX_RESULT_CHARS): unknown {
    if (result === null || result === undefined) return result;

    const serialized = JSON.stringify(result);
    if (serialized.length <= maxChars) return result;

    // For string results, middle-truncate
    if (typeof result === 'string') {
        return middleTruncateString(result, maxChars);
    }

    // For arrays (e.g., scene objects list), keep head + tail
    if (Array.isArray(result)) {
        return middleTruncateArray(result, maxChars);
    }

    // For objects, middle-truncate the serialized form
    if (typeof result === 'object') {
        return truncateObject(result as Record<string, unknown>, maxChars);
    }

    return result;
}

/**
 * Middle-truncate a string: keep first half and last half with a marker in between.
 */
function middleTruncateString(text: string, maxChars: number): string {
    const marker = '\n\n[... truncated middle section ...]\n\n';
    const budget = maxChars - marker.length;
    if (budget <= 0) return marker;

    const headBudget = Math.floor(budget / 2);
    const tailBudget = Math.ceil(budget / 2);

    // Find newline boundaries near cut points for clean breaks
    let headEnd = headBudget;
    const headNewline = text.lastIndexOf('\n', headBudget);
    if (headNewline > headBudget * 0.8) headEnd = headNewline;

    let tailStart = text.length - tailBudget;
    const tailNewline = text.indexOf('\n', tailStart);
    if (tailNewline !== -1 && tailNewline < tailStart + tailBudget * 0.2) tailStart = tailNewline + 1;

    const truncatedChars = tailStart - headEnd;
    const markerWithCount = `\n\n[... ${truncatedChars} chars truncated ...]\n\n`;

    return text.slice(0, headEnd) + markerWithCount + text.slice(tailStart);
}

/**
 * Middle-truncate an array: keep first N items + last N items with a gap marker.
 */
function middleTruncateArray(arr: unknown[], maxChars: number): unknown {
    const metadataReserve = 200;
    const budget = maxChars - metadataReserve;

    // Measure item sizes
    const sizes = arr.map(item => JSON.stringify(item).length);
    const totalSize = sizes.reduce((a, b) => a + b, 0);

    if (totalSize <= budget) {
        // Array serialization overhead caused the oversize, not item content
        return arr;
    }

    // Allocate budget: first half from head, second half from tail
    const headBudget = Math.floor(budget / 2);
    const tailBudget = Math.ceil(budget / 2);

    // Count head items
    let headChars = 0;
    let headCount = 0;
    for (let i = 0; i < arr.length; i++) {
        if (headChars + sizes[i] > headBudget && headCount > 0) break;
        headChars += sizes[i];
        headCount++;
    }

    // Count tail items (from end)
    let tailChars = 0;
    let tailCount = 0;
    for (let i = arr.length - 1; i >= headCount; i--) {
        if (tailChars + sizes[i] > tailBudget && tailCount > 0) break;
        tailChars += sizes[i];
        tailCount++;
    }

    const skipped = arr.length - headCount - tailCount;
    const items: unknown[] = [
        ...arr.slice(0, headCount),
        ...(skipped > 0 ? [{ _gap: true, _skipped: skipped }] : []),
        ...arr.slice(arr.length - tailCount),
    ];

    return {
        items,
        _truncated: true,
        _totalItems: arr.length,
        _keptItems: headCount + tailCount,
        _message: `Showing first ${headCount} and last ${tailCount} of ${arr.length} items (${skipped} skipped). Use filters to narrow results.`,
    };
}

function truncateObject(obj: Record<string, unknown>, maxChars: number): unknown {
    const serialized = JSON.stringify(obj, null, 0);
    if (serialized.length <= maxChars) return obj;

    // Middle-truncate the serialized JSON string
    const truncated = middleTruncateString(serialized, maxChars - 200);

    return {
        _truncated: true,
        _originalSize: serialized.length,
        _message: `Result truncated from ${serialized.length} to ~${maxChars} chars (middle section removed).`,
        data: truncated,
    };
}
