#!/usr/bin/env node
/**
 * OSS stemscript import smoke test.
 *
 * Drives the editor's `exec` flow programmatically against a real folder
 * import (3D Chess, shipped under stemstudio-importer/3d-chess/) without
 * touching the OS file picker. Verifies that:
 *   1. The script runs to completion (every import resolves, no script
 *      execution error).
 *   2. The resulting scene saves to the local ProjectStore.
 *   3. Reload from the dashboard finds the project and renders the canvas.
 *
 * Prerequisites:
 *   - `bun run dev` is up on PLAYWRIGHT_BASE_URL (defaults to localhost:5173).
 *   - The 3D Chess folder lives at GAME_FOLDER (defaults to the absolute
 *     path on this machine; override with $GAME_FOLDER for portability).
 *
 * Set HEADED=1 to watch. Report → scripts/playwright/oss-import-3dchess-output/.
 */
import {chromium} from "playwright";
import {writeFileSync, mkdirSync, readFileSync, readdirSync, statSync} from "node:fs";
import {dirname, resolve, basename, join} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "oss-import-3dchess-output");
mkdirSync(outDir, {recursive: true});

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const headed = process.env.HEADED === "1";
const gameFolder =
    process.env.GAME_FOLDER ||
    "/Users/n/erth/de-shadow-editor/stemstudio-importer/3d-chess";

function walkFiles(root) {
    const out = [];
    const recurse = (dir, prefix) => {
        for (const entry of readdirSync(dir)) {
            if (entry === ".DS_Store") continue;
            const abs = join(dir, entry);
            const rel = prefix ? `${prefix}/${entry}` : entry;
            if (statSync(abs).isDirectory()) {
                recurse(abs, rel);
            } else {
                out.push({name: rel, abs});
            }
        }
    };
    recurse(root, "");
    return out;
}

const report = {
    baseUrl,
    gameFolder,
    startedAt: new Date().toISOString(),
    steps: [],
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    aiRequests: [],
    assertions: {},
};
const failures = [];

function logStep(name, status = "ok", details = {}) {
    report.steps.push({name, status, details, t: new Date().toISOString()});
    const tag = status === "ok" ? "✓" : status === "warn" ? "⚠" : "✗";
    console.log(`${tag} ${name}${Object.keys(details).length ? ` — ${JSON.stringify(details).slice(0, 200)}` : ""}`);
}
function assert(name, cond, detail) {
    report.assertions[name] = {pass: !!cond, detail};
    if (cond) console.log(`✓ assert: ${name}`);
    else {
        console.log(`✗ assert: ${name} — ${detail ?? ""}`);
        failures.push(name);
    }
}

const browser = await chromium.launch({headless: !headed});
const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
page.on("console", m => {
    if (m.type() === "error") report.consoleErrors.push({text: m.text(), location: m.location()});
    // Capture our __stemRunScript breadcrumbs.
    const text = m.text();
    if (text.includes("__stemRunScript") || text.includes("[script]") || text.includes("ScriptExecutor")) {
        report.steps.push({name: `console: ${text.slice(0, 200)}`, status: m.type() === "error" ? "warn" : "ok", t: new Date().toISOString()});
    }
});
page.on("pageerror", e => report.pageErrors.push({message: e.message, stack: e.stack?.slice(0, 2000)}));
page.on("requestfailed", r => report.failedRequests.push({url: r.url(), method: r.method(), failure: r.failure()?.errorText}));
page.on("response", r => {
    const u = r.url();
    if (r.status() >= 400 && u.startsWith(baseUrl)) {
        report.failedRequests.push({url: u, method: r.request().method(), status: r.status()});
    }
});
page.on("framenavigated", frame => {
    if (frame === page.mainFrame()) {
        report.steps.push({name: `navigated to ${frame.url()}`, status: "warn", t: new Date().toISOString()});
    }
});

try {
    // Read the 3D Chess folder upfront so we can fail fast if the path is wrong.
    const files = walkFiles(gameFolder);
    const scriptFile = files.find(f => f.name.toLowerCase().endsWith(".stemscript"));
    assert("script-file-found", !!scriptFile, `no .stemscript in ${gameFolder}`);
    if (!scriptFile) throw new Error("missing .stemscript");
    const scriptContent = readFileSync(scriptFile.abs, "utf8");
    const folderFiles = files
        .filter(f => f !== scriptFile)
        .map(f => {
            const buf = readFileSync(f.abs);
            // Send the relative path (e.g. "behaviors/chessGame/behavior.yaml")
            // so the in-page hook can stamp webkitRelativePath and the
            // path-based import resolver can disambiguate duplicates.
            return {name: f.name, mime: mimeFor(f.name), data: buf.toString("base64")};
        });
    logStep("read 3d-chess folder", "ok", {files: files.length, script: basename(scriptFile.name)});

    // === Boot the editor on a fresh project + dismiss bootstrap ===
    // The public marketing site now owns `/`, so the editor's "start from
    // scratch" hero is no longer reachable there. Navigate straight to the
    // create-project route — it auto-creates a fresh project and mounts the
    // EngineRuntime, which is all this smoke needs.
    await page.goto(baseUrl + "/create/project", {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    const modal = page.locator('[aria-labelledby="oss-bootstrap-title"]').first();
    if (await modal.count() && await modal.isVisible().catch(() => false)) {
        await modal.locator('button:has-text("Browser storage")').first().click({timeout: 3000}).catch(() => {});
        await modal.locator('button:has-text("Continue")').first().click({timeout: 5000}).catch(() => {});
        await page.waitForSelector('[aria-labelledby="oss-bootstrap-title"]', {state: "detached", timeout: 5000}).catch(() => {});
        await page.waitForTimeout(800);
    }
    await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
    await page.waitForTimeout(8000);
    await page.screenshot({path: resolve(outDir, "01-editor.png")}).catch(() => {});
    const url = page.url();
    assert("editor-mounted", /\/create\/project\//.test(url), `URL: ${url}`);

    // Dismiss tutorial if open.
    const gotIt = page.locator('button:has-text("Got It")').first();
    if (await gotIt.count() && await gotIt.isVisible().catch(() => false)) {
        await gotIt.click({timeout: 3000}).catch(() => {});
        await page.waitForTimeout(400);
    }

    // === Open Copilot so the useTerminal hook mounts and exposes __stemRunScript ===
    const copilotBtn = page.locator('[data-testid="actionbar-copilot"]').first();
    const cBox = await copilotBtn.boundingBox();
    if (cBox) {
        await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    } else {
        await copilotBtn.click({timeout: 3000, force: true}).catch(() => {});
    }
    await page.waitForTimeout(2000);

    // === Drive the script ===
    const hookPresent = await page.evaluate(() => typeof window.__stemRunScript === "function");
    assert("run-script-hook-exposed", hookPresent, "window.__stemRunScript not exposed");
    if (!hookPresent) throw new Error("no stemRunScript");

    // Run the script. `__stemRunScript` defers to the same code path as the
    // `exec` builtin (folder mode). A successful exec sometimes triggers
    // a `openEditorRoute(...)` hard navigation that kills the evaluate's
    // execution context — treat that as completion and let the next step
    // wait for the new page to settle.
    const execStartUrl = page.url();
    try {
        // Fire and forget so the page can navigate freely.
        await page.evaluate(({content, files}) => {
            return window.__stemRunScript(content, files).then(
                () => { window.__stemRunScriptDone = "ok"; },
                err => { window.__stemRunScriptDone = String(err && err.message ? err.message : err); },
            );
        }, {content: scriptContent, files: folderFiles});
    } catch (e) {
        // Navigation during evaluate. Wait for the new page to load.
        logStep("exec evaluate detached (likely navigation)", "warn", {error: e.message.slice(0, 100)});
    }
    await page.waitForLoadState("networkidle", {timeout: 60000}).catch(() => {});
    await page.waitForTimeout(4000);
    const execResult = await page.evaluate(() => window.__stemRunScriptDone ?? null).catch(() => null);
    const execOk = execResult === "ok" || page.url() !== execStartUrl;
    logStep("exec result", execOk ? "ok" : "warn", {result: execResult, urlChanged: page.url() !== execStartUrl});
    assert("exec-completed", execOk, execResult ?? "no completion signal");

    await page.waitForTimeout(6000);
    await page.screenshot({path: resolve(outDir, "02-after-exec.png")}).catch(() => {});

    // === Save via AppMenu ===
    await page.locator('[data-testid="topnav-app-menu"]').first().click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(400);
    const save = page.locator('text=Save Project').first();
    assert("save-button-present", await save.isVisible().catch(() => false), "Save Project not visible");
    if (await save.isVisible().catch(() => false)) {
        await save.click({timeout: 3000}).catch(() => {});
        await page.waitForTimeout(2500);
    }
    await page.screenshot({path: resolve(outDir, "03-after-save.png")}).catch(() => {});

    // === Back to dashboard, find the project, reopen ===
    await page.goto(baseUrl + "/dashboard", {waitUntil: "domcontentloaded", timeout: 20000}).catch(() => {});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await page.waitForTimeout(3000);
    await page.screenshot({path: resolve(outDir, "04-dashboard.png")}).catch(() => {});

    const sceneIdMatch = url.match(/\/create\/project\/([^/?#]+)/);
    const sceneId = sceneIdMatch ? sceneIdMatch[1] : null;
    if (sceneId) {
        const card = page.locator(`[data-scene-id="${sceneId}"]`).first();
        const ok = await card.count();
        assert("imported-project-listed", ok > 0, `data-scene-id "${sceneId}" not found`);
        if (ok) {
            await card.click({timeout: 5000}).catch(() => {});
            await page.waitForLoadState("networkidle", {timeout: 20000}).catch(() => {});
            await page.waitForTimeout(8000);
            await page.screenshot({path: resolve(outDir, "05-reloaded.png")}).catch(() => {});
            const canvas = await page.locator("canvas").first().isVisible().catch(() => false);
            assert("canvas-visible-on-reload", canvas, "no canvas after reload");
        }
    }

    await page.waitForTimeout(1000);
} catch (e) {
    logStep("FATAL", "error", {error: e.message});
    failures.push("fatal:" + e.message);
} finally {
    report.finishedAt = new Date().toISOString();
    report.failures = failures;
    writeFileSync(resolve(outDir, "report.json"), JSON.stringify(report, null, 2));
    console.log(`\n=== Report ===`);
    console.log(`Console errors:  ${report.consoleErrors.length}`);
    console.log(`Page errors:     ${report.pageErrors.length}`);
    console.log(`Failed requests: ${report.failedRequests.length}`);
    console.log(`Assertions:      ${Object.values(report.assertions).filter(a => a.pass).length}/${Object.keys(report.assertions).length} passed`);
    console.log(`Output dir:      ${outDir}`);
    await browser.close();
    if (failures.length > 0) {
        console.error(`\nFAIL: ${failures.length} failed: ${failures.join(", ")}`);
        process.exit(1);
    }
}

function mimeFor(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith(".gltf")) return "model/gltf+json";
    if (lower.endsWith(".glb")) return "model/gltf-binary";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".mp3")) return "audio/mpeg";
    if (lower.endsWith(".wav")) return "audio/wav";
    if (lower.endsWith(".ogg")) return "audio/ogg";
    if (lower.endsWith(".mp4")) return "video/mp4";
    if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "application/x-yaml";
    if (lower.endsWith(".json")) return "application/json";
    if (lower.endsWith(".md") || lower.endsWith(".txt") || lower.endsWith(".stemscript")) return "text/plain";
    return "application/octet-stream";
}
