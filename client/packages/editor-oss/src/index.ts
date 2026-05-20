// @stem/editor-oss — OSS-safe editor + player + runtime core.
//
// This package contains code that must run without any proprietary backend.
// Anything imported here must be safe to publish under MIT to GitHub.
//
// Forbidden imports inside this package (enforced by ESLint
// no-restricted-paths once configured):
//   - @web-dashboard / dashboard-internal
//   - marketing pages
//   - avatar creator (MediaPipe-heavy)
//   - growafarm clients
//   - direct fetch() calls to /api/Scene/* or /api/AI/* — use the
//     interfaces below instead.

export * from "./mode/buildMode";
export * from "./ai";
export * from "./persistence";
