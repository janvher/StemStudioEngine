#!/usr/bin/env node
/**
 * Playground smoke for EVERY stemscript game under GAMES_ROOT.
 *
 * For each game folder that contains a `.stemscript`, this:
 *   1. activates playground mode (sessionStorage flag via ?mode=playground),
 *   2. boots a fresh project and imports the game via window.__stemRunScript,
 *   3. saves, reloads through the dashboard (the scene/v2 load path),
 *   4. enters Play and clicks START GAME (#startGameBtn) if present,
 *   5. screenshots each phase and audits console/page errors.
 *
 * A game PASSES when there are no uncaught page errors and no
 * "exception-like" console errors (TypeError/ReferenceError/Cannot read/…,
 * including BehaviorPluginManager onEditor* errors). Known-noisy lines
 * (THREE deprecations, WebGL shader warnings, [Violation], ResizeObserver)
 * are recorded but do not fail a game.
 *
 * Each game runs in its own browser context (isolated IndexedDB/sessionStorage)
 * and a failure in one game does not stop the others.
 *
 * Env:
 *   GAMES_ROOT   default /Users/n/erth/Games-StemScript
 *   GAMES        optional comma-list of folder names to restrict the run
 *   HEADED=1     watch the browser
 *   PLAYWRIGHT_BASE_URL  default http://localhost:5173
 * Report → scripts/playwright/oss-all-games-playground-output/
 */
import {chromium} from "playwright";
import {writeFileSync, mkdirSync, readFileSync, readdirSync, statSync, existsSync} from "node:fs";
import {dirname, resolve, basename, join} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// STORE_MODE=filesystem exercises the File System Access (folder) project store
// instead of the default IndexedDB store. Output goes to a mode-specific dir so
// the two runs don't clobber each other.
const storeMode = process.env.STORE_MODE === "filesystem" ? "filesystem" : "indexeddb";
const outRoot = resolve(__dirname, storeMode === "filesystem"
    ? "oss-all-games-filesystem-output"
    : "oss-all-games-playground-output");
mkdirSync(outRoot, {recursive: true});

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const headed = process.env.HEADED === "1";
const gamesRoot = process.env.GAMES_ROOT || "/Users/n/erth/Games-StemScript";
const gamesFilter = (process.env.GAMES || "").split(",").map(s => s.trim()).filter(Boolean);

// ---- file helpers ----
function walkFiles(root) {
    const out = [];
    const recurse = (dir, prefix) => {
        for (const entry of readdirSync(dir)) {
            if (entry === ".DS_Store") continue;
            const abs = join(dir, entry);
            const rel = prefix ? `${prefix}/${entry}` : entry;
            if (statSync(abs).isDirectory()) recurse(abs, rel);
            else out.push({name: rel, abs});
        }
    };
    recurse(root, "");
    return out;
}
function mimeFor(name) {
    const l = name.toLowerCase();
    if (l.endsWith(".gltf")) return "model/gltf+json";
    if (l.endsWith(".glb")) return "model/gltf-binary";
    if (l.endsWith(".png")) return "image/png";
    if (l.endsWith(".jpg") || l.endsWith(".jpeg")) return "image/jpeg";
    if (l.endsWith(".webp")) return "image/webp";
    if (l.endsWith(".mp3")) return "audio/mpeg";
    if (l.endsWith(".wav")) return "audio/wav";
    if (l.endsWith(".ogg")) return "audio/ogg";
    if (l.endsWith(".mp4")) return "video/mp4";
    if (l.endsWith(".hdr")) return "image/vnd.radiance";
    if (l.endsWith(".exr")) return "image/x-exr";
    if (l.endsWith(".yaml") || l.endsWith(".yml")) return "application/x-yaml";
    if (l.endsWith(".json")) return "application/json";
    if (l.endsWith(".md") || l.endsWith(".txt") || l.endsWith(".stemscript")) return "text/plain";
    return "application/octet-stream";
}

// ---- error classification ----
// Lines that are noisy-but-harmless in this engine; recorded, never fatal.
const NOISE = [
    /THREE\.\w+ has been deprecated/i,
    /THREE\.Clock: This module has been deprecated/i,
    /WebGLProgram: Shader Error/i,          // shader warns surface as console.error
    /Vertex shader is not compiled/i,
    /\[Violation\]/i,
    /ResizeObserver loop/i,
    /favicon/i,
    /Download the React DevTools/i,
    /sceneFields|lastSaveTime is undefined/i,
    /non-passive event listener/i,
];
// Lines that indicate a genuine runtime exception / behavior failure.
const EXCEPTION = [
    /TypeError/i,
    /ReferenceError/i,
    /RangeError/i,
    /is not a function/i,
    /Cannot read properties of/i,
    /Cannot access /i,
    /is not defined/i,
    /Unhandled|Uncaught/i,
    /Error in onEditor\w+ for plugin/i,     // BehaviorPluginManager lifecycle failures
    /Initialisation error in/i,
    /script (init|update|onStart|onEvent)/i,
];
const isNoise = t => NOISE.some(r => r.test(t));
const isException = t => !isNoise(t) && EXCEPTION.some(r => r.test(t));

// ---- discover games ----
function discoverGames() {
    const games = [];
    for (const entry of readdirSync(gamesRoot)) {
        if (entry.startsWith(".")) continue;
        const dir = join(gamesRoot, entry);
        if (!statSync(dir).isDirectory()) continue;
        if (gamesFilter.length && !gamesFilter.includes(entry)) continue;
        const files = walkFiles(dir);
        const scriptFile = files.find(f => f.name.toLowerCase().endsWith(".stemscript"));
        if (scriptFile) games.push({name: entry, dir, files, scriptFile});
    }
    return games.sort((a, b) => a.name.localeCompare(b.name));
}

const games = discoverGames();
console.log(`Discovered ${games.length} games under ${gamesRoot}${gamesFilter.length ? ` (filtered: ${gamesFilter.join(",")})` : ""}`);
if (!games.length) { console.error("No games found"); process.exit(1); }

console.log(`Project store mode: ${storeMode}`);
const browser = await chromium.launch({headless: !headed});
const summary = {baseUrl, gamesRoot, storeMode, startedAt: new Date().toISOString(), games: []};

// Bootstrap the File System Access (folder) store via OPFS so no directory
// picker is needed. Each browser context has its own OPFS partition, so a fresh
// "stem-fs" folder per game keeps them isolated. Must run on the origin before
// the navigation that boots the editor (rehydrateProjectStore reads these).
const bootstrapFilesystemStore = async (page) => {
    await page.evaluate(async () => {
        const root = await navigator.storage.getDirectory();
        try { await root.removeEntry("stem-fs", {recursive: true}); } catch { /* first run */ }
        const fsRoot = await root.getDirectoryHandle("stem-fs", {create: true});
        await new Promise((res, rej) => {
            const req = indexedDB.open("stemstudio-fs-handle", 1);
            req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains("handles")) db.createObjectStore("handles"); };
            req.onsuccess = () => { const tx = req.result.transaction("handles", "readwrite"); tx.objectStore("handles").put(fsRoot, "project-dir"); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); };
            req.onerror = () => rej(req.error);
        });
        localStorage.setItem("stemstudio.persistence.mode", "filesystem");
        localStorage.setItem("stemstudio.bootstrap.complete", "true");
    });
};

// dialog/modal helpers parameterised by page
const mkHelpers = (page) => ({
    dismissBootstrap: async () => {
        const bs = page.locator('[aria-labelledby="oss-bootstrap-title"]').first();
        if (await bs.count() && await bs.isVisible().catch(() => false)) {
            await bs.locator('button:has-text("Browser storage")').first().click({timeout: 3000}).catch(() => {});
            await bs.locator('button:has-text("Continue")').first().click({timeout: 5000}).catch(() => {});
            await page.waitForSelector('[aria-labelledby="oss-bootstrap-title"]', {state: "detached", timeout: 5000}).catch(() => {});
        }
    },
    dismissTutorial: async () => {
        const g = page.locator('button:has-text("Got It")').first();
        if (await g.count() && await g.isVisible().catch(() => false)) await g.click({timeout: 3000}).catch(() => {});
    },
});

async function runGame(game) {
    const outDir = resolve(outRoot, game.name);
    mkdirSync(outDir, {recursive: true});
    const rec = {
        name: game.name, script: basename(game.scriptFile.name), files: game.files.length,
        steps: [], consoleErrors: [], pageErrors: [], failedRequests: [], assetErrors: [],
        startClicked: false, canvasVisible: false, status: "pending", failReasons: [],
    };
    const step = (s, ok = true, d) => { rec.steps.push({s, ok, d}); console.log(`   ${ok ? "·" : "✗"} ${s}${d ? ` (${d})` : ""}`); };

    const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
    const page = await ctx.newPage();
    const {dismissBootstrap, dismissTutorial} = mkHelpers(page);
    // Asset-load failures surface as console WARNINGS (not errors), so the
    // exception filter misses them. These mean the scene didn't load fully
    // (missing models / skybox) — a hard fail for "loads perfectly".
    const ASSET_FAIL = /No data URL found for|Failed to load model|Failed to load texture|failed to restore project assets|failed to persist project assets/i;
    page.on("console", m => {
        const t = m.text();
        if (m.type() === "error") rec.consoleErrors.push(t.slice(0, 400));
        if (ASSET_FAIL.test(t)) rec.assetErrors.push(t.slice(0, 300));
    });
    page.on("pageerror", e => {
        // Capture the first stack frame too — it carries the behavior:// URL and
        // line, which pinpoints which game behavior threw.
        const stackFrame = (e.stack || "").split("\n").find(l => /behavior:\/\/|http/.test(l)) || "";
        rec.pageErrors.push(`${(e.message || String(e)).slice(0, 200)}${stackFrame ? ` @@ ${stackFrame.trim().slice(0, 200)}` : ""}`);
    });
    page.on("requestfailed", r => { const u = r.url(); if (!/favicon|analytics|sentry/i.test(u)) rec.failedRequests.push(`${r.method()} ${u} :: ${r.failure()?.errorText}`); });

    try {
        const scriptContent = readFileSync(game.scriptFile.abs, "utf8");
        const folderFiles = game.files.filter(f => f !== game.scriptFile)
            .map(f => ({name: f.name, mime: mimeFor(f.name), data: readFileSync(f.abs).toString("base64")}));

        // 1. activate playground
        await page.goto(baseUrl + "/dashboard?mode=playground", {waitUntil: "domcontentloaded", timeout: 30000});
        await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
        await dismissBootstrap();
        const pg = await page.evaluate(() => { try { return window.sessionStorage.getItem("stem.playgroundMode") === "1"; } catch { return false; } });
        step("playground activated", pg);
        if (storeMode === "filesystem") {
            await bootstrapFilesystemStore(page);
            step("filesystem (OPFS) store bootstrapped");
        }

        // 2. fresh project
        await page.goto(baseUrl + "/create/project", {waitUntil: "domcontentloaded", timeout: 30000});
        await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
        await dismissBootstrap();
        await page.waitForTimeout(6000);
        await dismissTutorial();

        // 3. expose __stemRunScript via copilot, import
        const copilotBtn = page.locator('[data-testid="actionbar-copilot"]').first();
        const cBox = await copilotBtn.boundingBox().catch(() => null);
        if (cBox) await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
        else await copilotBtn.click({timeout: 3000, force: true}).catch(() => {});
        await page.waitForTimeout(2000);
        const hookPresent = await page.evaluate(() => typeof window.__stemRunScript === "function");
        step("run-script hook exposed", hookPresent);
        if (!hookPresent) throw new Error("__stemRunScript not exposed");

        const execStartUrl = page.url();
        try {
            await page.evaluate(({content, fileList}) =>
                window.__stemRunScript(content, fileList).then(() => { window.__d = "ok"; }, e => { window.__d = String(e && e.message ? e.message : e); }),
                {content: scriptContent, fileList: folderFiles});
        } catch { /* exec may navigate */ }
        await page.waitForLoadState("networkidle", {timeout: 120000}).catch(() => {});
        await page.waitForTimeout(6000);
        await dismissTutorial();
        const execResult = await page.evaluate(() => window.__d ?? null).catch(() => null);
        const execOk = execResult === "ok" || page.url() !== execStartUrl;
        step("import exec", execOk, execResult ?? "no signal");
        await page.screenshot({path: resolve(outDir, "01-after-import.png")}).catch(() => {});

        // 4. save
        await page.locator('[data-testid="topnav-app-menu"]').first().click({timeout: 3000, force: true}).catch(() => {});
        await page.waitForTimeout(400);
        const save = page.locator("text=Save Project").first();
        if (await save.isVisible().catch(() => false)) {
            await save.click({timeout: 3000}).catch(() => {});
            // Filesystem (OPFS) saves write asset files then assets.json LAST and
            // can take several seconds; reloading before the manifest is written
            // loses every asset (skybox/models). Wait for the "Saved" toast,
            // which the save handler emits only after assets are fully persisted.
            // Heavy games (cubecity's ~21MB of building GLBs) take well over a
            // minute to write to OPFS; wait generously for the "Saved" toast so
            // the body + asset manifest are fully persisted before we reload.
            await page.locator("text=/^Saved$/").first().waitFor({state: "visible", timeout: 180000}).catch(() => {});
            await page.waitForTimeout(1500);
        }
        const sceneId = (page.url().match(/\/create\/project\/([^/?#]+)/) || [])[1] || null;
        step("saved", !!sceneId, sceneId ?? "no scene id");

        // 5. reload via dashboard
        await page.goto(baseUrl + "/dashboard?mode=playground", {waitUntil: "domcontentloaded", timeout: 20000}).catch(() => {});
        await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
        await dismissBootstrap();
        await page.waitForTimeout(2000);
        if (sceneId) {
            const card = page.locator(`[data-scene-id="${sceneId}"]`).first();
            // Poll for the card: the folder store's project list can take a
            // moment to rehydrate from OPFS, especially right after a heavy save.
            await card.waitFor({state: "attached", timeout: 30000}).catch(() => {});
            if (await card.count()) {
                await card.click({timeout: 5000}).catch(() => {});
                await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
                await dismissBootstrap();
                await page.waitForSelector("canvas", {timeout: 30000}).catch(() => {});
                await dismissTutorial();
                await page.waitForTimeout(8000);
            } else step("project card found on dashboard", false, sceneId);
        }
        rec.canvasVisible = await page.locator("canvas").first().isVisible().catch(() => false);
        step("editor reloaded, canvas visible", rec.canvasVisible);
        await page.screenshot({path: resolve(outDir, "02-reloaded-editor.png")}).catch(() => {});

        // mark: errors before play are "load" errors
        const loadErrCount = rec.consoleErrors.length;

        // 6. enter Play + START GAME
        const playBtn = page.locator('[data-testid="topnav-play"]').first();
        if (await playBtn.isVisible().catch(() => false)) {
            await playBtn.click({timeout: 3000, force: true}).catch(() => {});
            const dontSave = page.locator("button", {hasText: /don['’]t\s*save/i}).first();
            if (await dontSave.count() && await dontSave.isVisible().catch(() => false)) { await dontSave.click().catch(() => {}); await page.waitForTimeout(500); }
            await page.waitForTimeout(4000);
            await page.screenshot({path: resolve(outDir, "03-play-pre-start.png")}).catch(() => {});

            const startGame = page.locator("#startGameBtn").first();
            try {
                await startGame.waitFor({state: "visible", timeout: 12000});
                await page.waitForFunction(() => { const b = document.getElementById("startGameBtn"); return b && !b.disabled && b.getAttribute("aria-disabled") !== "true"; }, {timeout: 12000});
                await startGame.click({timeout: 5000, force: true});
                rec.startClicked = true;
                step("clicked START GAME");
            } catch {
                step("no START GAME button (auto-start game)", true);
            }
            // Generous settle: runtime-generated games (procedural terrain,
            // spawned troops) and FS-mode asset decode need time before the
            // scene is fully populated for the screenshot / UIKit check.
            await page.waitForTimeout(20000);
            await page.screenshot({path: resolve(outDir, "04-playing.png")}).catch(() => {});
        } else {
            step("Play button not visible", false);
            rec.failReasons.push("play-button-missing");
        }
    } catch (e) {
        step("FATAL", false, (e.message || String(e)).slice(0, 200));
        rec.failReasons.push("fatal:" + (e.message || String(e)).slice(0, 160));
    } finally {
        // classify errors
        rec.exceptionErrors = [...new Set(rec.consoleErrors.filter(isException))].slice(0, 15);
        rec.noiseErrorCount = rec.consoleErrors.filter(isNoise).length;
        rec.assetErrors = [...new Set(rec.assetErrors)].slice(0, 15);
        if (rec.pageErrors.length) rec.failReasons.push(`${rec.pageErrors.length} uncaught page error(s)`);
        if (rec.exceptionErrors.length) rec.failReasons.push(`${rec.exceptionErrors.length} exception-like console error(s)`);
        if (rec.assetErrors.length) rec.failReasons.push(`${rec.assetErrors.length} asset-load failure(s)`);
        if (!rec.canvasVisible) rec.failReasons.push("canvas-not-visible");
        rec.status = rec.failReasons.length ? "FAIL" : "PASS";
        writeFileSync(resolve(outDir, "report.json"), JSON.stringify(rec, null, 2));
        await ctx.close();
    }
    return rec;
}

for (let i = 0; i < games.length; i++) {
    console.log(`\n[${i + 1}/${games.length}] ▶ ${games[i].name}`);
    const rec = await runGame(games[i]);
    summary.games.push(rec);
    const tag = rec.status === "PASS" ? "✅" : "❌";
    console.log(`   ${tag} ${rec.name}: ${rec.status}${rec.failReasons.length ? " — " + rec.failReasons.join("; ") : ""}`);
}

summary.finishedAt = new Date().toISOString();
summary.passed = summary.games.filter(g => g.status === "PASS").map(g => g.name);
summary.failed = summary.games.filter(g => g.status === "FAIL").map(g => g.name);
writeFileSync(resolve(outRoot, "summary.json"), JSON.stringify(summary, null, 2));

console.log(`\n=================== SUMMARY ===================`);
console.log(`Passed: ${summary.passed.length}/${summary.games.length}`);
for (const g of summary.games) {
    const tag = g.status === "PASS" ? "✅" : "❌";
    console.log(`${tag} ${g.name.padEnd(22)} start=${g.startClicked ? "Y" : "-"} canvas=${g.canvasVisible ? "Y" : "-"} exc=${g.exceptionErrors?.length ?? 0} page=${g.pageErrors.length} asset=${g.assetErrors?.length ?? 0} noise=${g.noiseErrorCount ?? 0}${g.failReasons.length ? "  << " + g.failReasons.join("; ") : ""}`);
}
console.log(`\nReport dir: ${outRoot}`);
await browser.close();
process.exit(summary.failed.length ? 1 : 0);
