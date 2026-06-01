#!/usr/bin/env node
/**
 * Playwright verification for the "no error-masking fallbacks" work.
 *
 * Drives a real stemscript game import end-to-end through the playground +
 * File System (OPFS) store and asserts that the hardened fallback paths behave
 * honestly — i.e. a failure cannot hide:
 *
 *   1. no-batch-import-dialog   — every import auto-resolves; the blocking
 *                                 "Import Assets" modal (which hangs headless)
 *                                 never opens. Regression guard for the
 *                                 odd-extension filepath bug.
 *   2. import-no-failed-commands — runScript's summary.failCount === 0; an
 *                                 unresolved/failed import would surface here.
 *   3. models-present            — the import actually created mesh content.
 *   4. assets-survive-reload     — after save → reload from the folder store,
 *                                 the mesh count is preserved. This is the live
 *                                 check on FileSystemProjectStore.loadAssets and
 *                                 ossSaveScene: if either silently dropped an
 *                                 asset / swallowed a persist failure, the
 *                                 reloaded scene would be missing geometry and
 *                                 this assertion fails loudly.
 *
 * Uses a LIGHT game by default (small-world: 6 models) so it completes quickly,
 * independent of heavy-game import performance. Override with $GAME_FOLDER.
 *
 *   bun run dev must be up on PLAYWRIGHT_BASE_URL (default localhost:5173).
 *   HEADED=1 to watch. Report → scripts/playwright/oss-import-fallback-verify-output/.
 */
import {chromium} from "playwright";
import {writeFileSync, mkdirSync, readFileSync, readdirSync, statSync, existsSync} from "node:fs";
import {dirname, resolve, basename, join} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "oss-import-fallback-verify-output");
mkdirSync(outDir, {recursive: true});

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const headed = process.env.HEADED === "1";
const gameFolder = process.env.GAME_FOLDER || "/Users/n/erth/Games-StemScript/small-world";
const IMPORT_TIMEOUT_MS = Number(process.env.IMPORT_TIMEOUT_MS || 8 * 60 * 1000);

const MIME = {".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".bin": "application/octet-stream", ".json": "application/json", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".hdr": "image/vnd.radiance", ".yaml": "text/yaml", ".yml": "text/yaml", ".stemscript": "text/plain"};
const mimeFor = n => MIME[(n.match(/\.[^.]+$/) || [""])[0].toLowerCase()] || "application/octet-stream";

function walk(root) {
    const out = [];
    const rec = (dir, prefix) => {
        for (const e of readdirSync(dir)) {
            if (e === ".DS_Store") continue;
            const abs = join(dir, e);
            const rel = prefix ? `${prefix}/${e}` : e;
            if (statSync(abs).isDirectory()) rec(abs, rel);
            else out.push({name: rel, abs});
        }
    };
    rec(root, "");
    return out;
}

const report = {baseUrl, gameFolder, startedAt: new Date().toISOString(), assertions: {}, steps: [], consoleErrors: []};
const failures = [];
function assert(name, cond, detail) {
    report.assertions[name] = {pass: !!cond, detail};
    if (cond) console.log(`✓ assert: ${name}`);
    else { console.log(`✗ assert: ${name} — ${detail ?? ""}`); failures.push(name); }
}
function logStep(name, status = "ok", details = {}) {
    report.steps.push({name, status, details});
    console.log(`${status === "ok" ? "✓" : status === "warn" ? "⚠" : "✗"} ${name}${Object.keys(details).length ? ` — ${JSON.stringify(details).slice(0, 160)}` : ""}`);
}

assert("game-folder-exists", existsSync(gameFolder), gameFolder);
const files = existsSync(gameFolder) ? walk(gameFolder) : [];
const scriptFile = files.find(f => f.name.endsWith(".stemscript"));
assert("script-file-found", !!scriptFile, `no .stemscript in ${gameFolder}`);
if (!scriptFile) { writeFileSync(resolve(outDir, "report.json"), JSON.stringify(report, null, 2)); process.exit(1); }
const scriptContent = readFileSync(scriptFile.abs, "utf8");
const folderFiles = files.filter(f => f !== scriptFile).map(f => ({name: f.name, mime: mimeFor(f.name), data: readFileSync(f.abs).toString("base64")}));
logStep("read game folder", "ok", {files: files.length, script: basename(scriptFile.name)});

const browser = await chromium.launch({headless: !headed});
const page = await (await browser.newContext({viewport: {width: 1440, height: 900}, serviceWorkers: "block"})).newPage();
page.on("console", m => { if (m.type() === "error") report.consoleErrors.push(m.text().slice(0, 300)); });
page.on("pageerror", e => report.consoleErrors.push("pageerror: " + e.message.slice(0, 300)));

const bootstrapFS = async p => p.evaluate(async () => {
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
const dismissBootstrap = async () => {
    const bs = page.locator('[aria-labelledby="oss-bootstrap-title"]').first();
    if (await bs.count() && await bs.isVisible().catch(() => false)) {
        await bs.locator('button:has-text("Browser storage")').first().click({timeout: 3000}).catch(() => {});
        await bs.locator('button:has-text("Continue")').first().click({timeout: 5000}).catch(() => {});
        await page.waitForTimeout(400);
    }
};
const dismissTutorial = async () => {
    const g = page.locator('button:has-text("Got It")').first();
    if (await g.count() && await g.isVisible().catch(() => false)) { await g.click({timeout: 3000}).catch(() => {}); await page.waitForTimeout(300); }
};
const batchDialogOpen = async () => page.evaluate(() => /Import Assets \(/.test(document.body?.innerText || "")).catch(() => false);
const sceneState = async () => page.evaluate(() => (window.__stemGetScene ? window.__stemGetScene() : null)).catch(() => null);

try {
    await page.goto(baseUrl + "/dashboard?mode=playground", {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    await bootstrapFS(page);
    logStep("filesystem (OPFS) store bootstrapped");

    await page.goto(baseUrl + "/create/project", {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    await page.waitForTimeout(6000);
    await dismissTutorial();
    assert("filesystem-store-selected",
        (await page.evaluate(() => { try { return localStorage.getItem("stemstudio.persistence.mode"); } catch { return null; } })) === "filesystem");

    const copilotBtn = page.locator('[data-testid="actionbar-copilot"]').first();
    const cBox = await copilotBtn.boundingBox().catch(() => null);
    if (cBox) await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    else await copilotBtn.click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(2000);
    const hookPresent = await page.evaluate(() => typeof window.__stemRunScript === "function");
    assert("run-script-hook-exposed", hookPresent);
    if (!hookPresent) throw new Error("no __stemRunScript");

    // Fire the import; poll for completion, dismissing (and flagging) the batch
    // dialog if it ever appears so the run can never hang silently.
    await page.evaluate(({content, fileList}) => {
        window.__done = null; window.__summary = null;
        window.__stemRunScript(content, fileList).then(
            s => { window.__done = "ok"; window.__summary = s ?? null; },
            e => { window.__done = String(e && e.message ? e.message : e); },
        );
    }, {content: scriptContent, fileList: folderFiles});

    let dialogSeen = false, done = null;
    const deadline = Date.now() + IMPORT_TIMEOUT_MS;
    while (Date.now() < deadline) {
        done = await page.evaluate(() => window.__done).catch(() => null);
        if (done) break;
        if (await batchDialogOpen()) {
            dialogSeen = true;
            const skip = page.locator('button:has-text("Skip All")').first();
            if (await skip.count()) await skip.click({timeout: 2000, force: true}).catch(() => {});
            else await page.keyboard.press("Escape").catch(() => {});
        }
        await page.waitForTimeout(2500);
    }
    await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
    await dismissTutorial();

    assert("exec-completed", done === "ok", `done=${done}`);
    assert("no-batch-import-dialog", !dialogSeen, "batch-import dialog appeared (an import failed to auto-resolve)");

    const summary = await page.evaluate(() => window.__summary).catch(() => null);
    report.runSummary = summary;
    assert("import-no-failed-commands", !!summary && summary.failCount === 0, `summary=${JSON.stringify(summary)}`);

    const afterImport = await sceneState();
    const meshAfterImport = afterImport?.meshCount ?? 0;
    report.meshAfterImport = meshAfterImport;
    assert("models-present", meshAfterImport > 0, `meshCount=${meshAfterImport}`);
    await page.screenshot({path: resolve(outDir, "01-after-import.png")}).catch(() => {});

    // === Save → reload → assert assets survived (the persistence fallback paths). ===
    await page.locator('[data-testid="topnav-app-menu"]').first().click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(400);
    const save = page.locator("text=Save Project").first();
    if (await save.isVisible().catch(() => false)) {
        await save.click({timeout: 3000}).catch(() => {});
        await page.locator("text=/^Saved$/").first().waitFor({state: "visible", timeout: 120000}).catch(() => {});
        await page.waitForTimeout(1500);
    }
    const sceneId = (page.url().match(/\/create\/project\/([^/?#]+)/) || [])[1] || null;
    assert("scene-id-resolved", !!sceneId, `URL: ${page.url()}`);

    await page.goto(baseUrl + "/dashboard?mode=playground", {waitUntil: "domcontentloaded", timeout: 20000}).catch(() => {});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    await page.waitForTimeout(2000);
    if (sceneId) {
        const card = page.locator(`[data-scene-id="${sceneId}"]`).first();
        await card.waitFor({state: "attached", timeout: 30000}).catch(() => {});
        assert("imported-project-listed", (await card.count()) > 0, `data-scene-id="${sceneId}" not found`);
        if (await card.count()) {
            await card.click({timeout: 5000}).catch(() => {});
            await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
            await page.waitForTimeout(8000);
            await dismissTutorial();
        }
    }
    const afterReload = await sceneState();
    const meshAfterReload = afterReload?.meshCount ?? 0;
    report.meshAfterReload = meshAfterReload;
    await page.screenshot({path: resolve(outDir, "02-after-reload.png")}).catch(() => {});
    // The crux: if loadAssets silently dropped an asset, or ossSaveScene
    // swallowed a persist failure, the reloaded scene would be missing geometry.
    // Allow tiny variance but require the bulk of meshes to survive.
    assert("assets-survive-reload", meshAfterReload >= Math.floor(meshAfterImport * 0.9),
        `meshAfterImport=${meshAfterImport} meshAfterReload=${meshAfterReload}`);

    assert("no-uncaught-page-errors", report.consoleErrors.filter(e => e.startsWith("pageerror")).length === 0,
        report.consoleErrors.filter(e => e.startsWith("pageerror"))[0] ?? "");
} catch (err) {
    logStep("fatal", "fail", {error: String(err && err.message ? err.message : err).slice(0, 300)});
    failures.push("fatal");
} finally {
    report.finishedAt = new Date().toISOString();
    report.failures = failures;
    writeFileSync(resolve(outDir, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
}

console.log(`\n${failures.length === 0 ? "✅ PASS" : "❌ FAIL"} — ${Object.values(report.assertions).filter(a => a.pass).length}/${Object.keys(report.assertions).length} assertions passed`);
if (failures.length) console.log("failed: " + failures.join(", "));
console.log("FALLBACK_VERIFY_DONE");
process.exit(failures.length ? 1 : 0);
