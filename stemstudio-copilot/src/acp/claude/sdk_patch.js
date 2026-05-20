/**
 * Prunes completed tool_use ↔ tool_result message pairs from history.
 * Keeps the last `keepChains` completed chains intact.
 * Completed chains that are pruned are replaced with a compact summary message.
 *
 * A "chain" = one or more consecutive assistant(tool_use) + user(tool_result)
 * message pairs, terminated by an assistant message with only text content.
 */
function pruneToolHistory(messages, keepChains = 2) {
    // ── helpers ──────────────────────────────────────────────────────────────

    function isToolUseMsg(msg) {
        return (
            msg.role === "assistant" &&
            Array.isArray(msg.content) &&
            msg.content.some((b) => b.type === "tool_use")
        );
    }

    function isToolResultMsg(msg) {
        return (
            msg.role === "user" &&
            Array.isArray(msg.content) &&
            msg.content.length > 0 &&
            msg.content.every((b) => b.type === "tool_result")
        );
    }

    function isPlainTextMsg(msg) {
        return (
            msg.role === "assistant" &&
            Array.isArray(msg.content) &&
            msg.content.length > 0 &&
            msg.content.every((b) => b.type === "text")
        );
    }

    function extractToolName(assistantMsg) {
        return assistantMsg.content
            .filter((b) => b.type === "tool_use")
            .map((b) => b.name)
            .join(", ");
    }

    function extractResultText(userMsg) {
        return userMsg.content
            .filter((b) => b.type === "tool_result")
            .map((b) => {
                if (typeof b.content === "string") return b.content;
                if (Array.isArray(b.content))
                    return b.content
                        .filter((x) => x.type === "text")
                        .map((x) => x.text)
                        .join(" ");
                return "";
            })
            .join(" ")
            .slice(0, 100) // truncate long outputs
            .trim();
    }

    // ── pass 1: identify completed chains ────────────────────────────────────
    // A completed chain is a run of alternating tool_use/tool_result messages
    // followed by a plain-text assistant message (the final response).
    // We record the index range of each chain (not including the final text msg).

    const chains = []; // { start, end, pairs: [{toolName, resultText}] }
    let i = 0;

    while (i < messages.length) {
        if (!isToolUseMsg(messages[i])) {
            i++;
            continue;
        }

        const chainStart = i;
        const pairs = [];

        // Collect alternating assistant(tool_use) / user(tool_result) pairs
        while (i < messages.length) {
            if (isToolUseMsg(messages[i])) {
                const toolName = extractToolName(messages[i]);
                const callIdx = i;
                i++;

                if (i < messages.length && isToolResultMsg(messages[i])) {
                    const resultText = extractResultText(messages[i]);
                    const isError = messages[i].content.some((b) => b.is_error === true);
                    pairs.push({ toolName, resultText, isError });
                    i++;
                } else {
                    // tool_use with no matching tool_result = chain still in flight, stop
                    i = callIdx; // rewind
                    break;
                }
            } else {
                break;
            }
        }

        // Chain is "complete" only if immediately followed by a plain-text response
        if (pairs.length > 0 && i < messages.length && isPlainTextMsg(messages[i])) {
            chains.push({ start: chainStart, end: i - 1, pairs });
        }
        // Whether complete or not, advance past this block
        i++;
    }

    // ── pass 2: decide which chains to prune ─────────────────────────────────
    // Keep the last `keepChains` completed chains intact.
    // Replace older ones with a single summary user message.

    const chainsToPrune = chains.slice(0, -keepChains); // oldest first
    if (chainsToPrune.length === 0) return messages; // nothing to do

    // Build a set of message indices to remove
    const indicesToRemove = new Set();
    const summaryInsertions = new Map(); // index → summary text

    for (const chain of chainsToPrune) {
        for (let idx = chain.start; idx <= chain.end; idx++) {
            indicesToRemove.add(idx);
        }

        // Build the summary text
        const lines = chain.pairs.map((p) => {
            const status = p.isError ? "✗" : "✓";
            const result = p.resultText ? `: ${p.resultText}` : "";
            return `  ${status} ${p.toolName}${result}`;
        });
        const summary = `[tool_summary]\n${lines.join("\n")}\n[/tool_summary]`;

        // Insert the summary where the chain started
        summaryInsertions.set(chain.start, summary);
    }

    // ── pass 3: rebuild the message array ────────────────────────────────────

    const result = [];

    for (let idx = 0; idx < messages.length; idx++) {
        if (summaryInsertions.has(idx)) {
            result.push({
                role: "user",
                content: [{ type: "text", text: summaryInsertions.get(idx) }],
            });
        }
        if (!indicesToRemove.has(idx)) {
            result.push(messages[idx]);
        }
    }

    return result;
}

/**
 * Remove $schema from tool definitions
 * @param tools
 * @returns {*}
 */
function stripSchema(tools) {
    k(`stripSchema: ${tools.length}`);
    return tools.map(({ input_schema: { $schema, ...rest }, ...tool }) => ({
        ...tool,
        input_schema: rest,
    }));
}

/**
 * Set up the fetch hook.
 * k() writes a message into the SDK log file. It can be enabled through these env vars:
 *  CLAUDE_CODE_DEBUG_LOGS_DIR=/tmp/logs/log.txt
 *  DEBUG_SDK=true
 * @type {(input: (RequestInfo | URL), init?: RequestInit) => Promise<Response>}
 */
const originalFetch = global.fetch;
global.fetch = async (url, init, ...rest) => {
    k(`globalThis.fetch: ${JSON.stringify(url)}`);
    try {
        const body = JSON.parse(init.body);
        if (body.tools?.length)    body.tools    = stripSchema(body.tools);
        if (body.messages?.length) body.messages = pruneToolHistory(body.messages);
        init = { ...init, body: JSON.stringify(body) };
    } catch(e) {
    }
    return originalFetch(url, init, ...rest);
};
