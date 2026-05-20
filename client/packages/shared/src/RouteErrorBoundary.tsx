import {useState} from "react";
import {isRouteErrorResponse, useRouteError} from "react-router-dom";

type NormalizedRouteError = {
    title: string;
    summary: string;
    details: string;
};

const copyWithFallback = async (text: string) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
};

const normalizeRouteError = (error: unknown): NormalizedRouteError => {
    if (isRouteErrorResponse(error)) {
        return {
            title: `${error.status} ${error.statusText}`.trim(),
            summary: typeof error.data === "string" ? error.data : "A route error was thrown.",
            details: typeof error.data === "string" ? "" : JSON.stringify(error.data, null, 2),
        };
    }

    if (error instanceof Error) {
        return {
            title: error.name || "Unexpected application error",
            summary: error.message || "The route crashed while rendering.",
            details: error.stack || "",
        };
    }

    if (typeof error === "string") {
        return {
            title: "Unexpected application error",
            summary: error,
            details: "",
        };
    }

    return {
        title: "Unexpected application error",
        summary: "The route crashed while rendering.",
        details: JSON.stringify(error, null, 2),
    };
};

export const RouteErrorBoundary = () => {
    const routeError = useRouteError();
    const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
    const error = normalizeRouteError(routeError);
    const copyText = [error.title, error.summary, error.details].filter(Boolean).join("\n\n");

    const handleCopy = async () => {
        try {
            await copyWithFallback(copyText);
            setCopyStatus("copied");
        } catch (copyError) {
            console.error("Failed to copy route error details:", copyError);
            setCopyStatus("failed");
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#050816",
                color: "#f8fafc",
                padding: "32px 20px 48px",
                display: "flex",
                justifyContent: "center",
                userSelect: "text",
                WebkitUserSelect: "text",
            }}
        >
            <div
                style={{
                    width: "min(880px, 100%)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    pointerEvents: "auto",
                }}
            >
                <div
                    style={{
                        fontSize: 14,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#7dd3fc",
                    }}
                >
                    Route Crash
                </div>
                <h1 style={{margin: 0, fontSize: "clamp(28px, 5vw, 40px)", lineHeight: 1.1}}>{error.title}</h1>
                <p style={{margin: 0, fontSize: 16, lineHeight: 1.6, color: "#cbd5e1"}}>{error.summary}</p>
                <div style={{display: "flex", gap: 12, flexWrap: "wrap"}}>
                    <button
                        onClick={() => void handleCopy()}
                        style={{
                            border: "1px solid rgba(125, 211, 252, 0.28)",
                            background: "rgba(14, 165, 233, 0.14)",
                            color: "#f8fafc",
                            borderRadius: 999,
                            padding: "10px 16px",
                            cursor: "pointer",
                        }}
                    >
                        {copyStatus === "copied" ? "Copied logs" : "Copy logs"}
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            border: "1px solid rgba(248, 250, 252, 0.18)",
                            background: "transparent",
                            color: "#f8fafc",
                            borderRadius: 999,
                            padding: "10px 16px",
                            cursor: "pointer",
                        }}
                    >
                        Reload page
                    </button>
                    {copyStatus === "failed" && (
                        <span style={{alignSelf: "center", color: "#fda4af"}}>
                            Copy failed. You can still select the text below.
                        </span>
                    )}
                </div>
                {error.details && (
                    <pre
                        style={{
                            margin: 0,
                            padding: 16,
                            borderRadius: 16,
                            background: "rgba(15, 23, 42, 0.9)",
                            border: "1px solid rgba(148, 163, 184, 0.2)",
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            userSelect: "text",
                            WebkitUserSelect: "text",
                        }}
                    >
                        {error.details}
                    </pre>
                )}
            </div>
        </div>
    );
};
