#!/usr/bin/env node
/**
 * Deploy-routing smoke. Validates that the _redirects rules in
 * client/public/_redirects route URL paths to the right SPA shell. This is
 * a static-text check against the built output — useful in CI before
 * pushing to Cloudflare Pages / Render so a broken rule doesn't reach prod.
 *
 * Expected mapping (must match render.yaml + Cloudflare expectations):
 *   /                              → index.html
 *   /docs, /docs/*                 → index.html
 *   /playground, /playground/*     → index.html
 *   /dashboard, /dashboard/*       → shell.html
 *   /create/project[/*]            → editor.html
 *   /stem-editor[/*]               → editor.html
 *   /play/*                        → play.html
 *   /<anything else>               → index.html (site 404)
 */
import {readFileSync, existsSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const redirectsPath = resolve(repoRoot, "client", "public", "_redirects");

const failures = [];
function assert(name, condition, detail) {
    console.log(`${condition ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
    if (!condition) failures.push(name);
}

assert("_redirects exists at client/public/_redirects", existsSync(redirectsPath));
if (!existsSync(redirectsPath)) {
    process.exit(1);
}

const lines = readFileSync(redirectsPath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

// Parse into [from, to, status] tuples.
const rules = lines.map((l) => {
    const parts = l.split(/\s+/);
    return {from: parts[0], to: parts[1], status: parts[2]};
});

// First-match-wins helper.
function resolveRule(path) {
    for (const r of rules) {
        const pattern = new RegExp("^" + r.from.replace(/\*/g, ".*").replace(/\//g, "\\/") + "$");
        if (pattern.test(path)) return r;
    }
    return null;
}

const expectations = [
    ["/", "/index.html"],
    ["/docs", "/index.html"],
    ["/docs/architecture", "/index.html"],
    ["/playground", "/index.html"],
    ["/playground/something", "/index.html"],
    ["/dashboard", "/shell.html"],
    ["/dashboard/projects", "/shell.html"],
    ["/create/project", "/editor.html"],
    ["/create/project/abc123", "/editor.html"],
    ["/stem-editor/abc", "/editor.html"],
    ["/play/abc123", "/play.html"],
    ["/foo/bar/baz", "/index.html"],
];

for (const [from, expected] of expectations) {
    const hit = resolveRule(from);
    assert(`${from} → ${expected}`, hit && hit.to === expected, hit ? `got ${hit.to}` : "no rule matched");
    assert(`${from} returns 200`, hit && hit.status === "200", hit?.status ?? "missing");
}

if (failures.length) {
    console.error(`\nFAILED: ${failures.length} assertion(s)`);
    process.exit(1);
}
console.log("\nsite deploy-routing check: PASS");
