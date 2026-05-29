#!/usr/bin/env node
/**
 * End-to-end (PLAYGROUND mode): activate playground, import the Solar System
 * stemscript fresh, save, reload through the playground dashboard, and verify
 * the behavior framework wires texture loading without the
 * `applyTexture` / `loadRingTexture` "Cannot read properties of undefined
 * (reading 'asset')" crash — the exact regression reported in playground mode.
 *
 * The crash originates in the game's editor lifecycle hooks (onEditorAdded)
 * reading an init()-only `erth` local. Playground is just a UI-gating flag; it
 * loads the project through the same `onSceneLoaded` path, so a clean fresh
 * import here proves the fixed behavior code is good in playground too.
 *
 * Source folder: GAME_FOLDER (defaults to the fixed Games-StemScript copy).
 * Prereq: `bun run dev` on PLAYWRIGHT_BASE_URL (default localhost:5173).
 * Set HEADED=1 to watch. Report → scripts/playwright/oss-solar-system-playground-output/.
 */
import {chromium} from "playwright";
import {writeFileSync, mkdirSync, readFileSync, readdirSync, statSync, existsSync} from "node:fs";
import {dirname, resolve, basename, join} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "oss-solar-system-playground-output");
mkdirSync(outDir, {recursive: true});

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const headed = process.env.HEADED === "1";
const gameFolder = process.env.GAME_FOLDER || "/Users/n/erth/Games-StemScript/solar-system";

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
    const lower = name.toLowerCase();
    if (lower.endsWith(".gltf")) return "model/gltf+json";
    if (lower.endsWith(".glb")) return "model/gltf-binary";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "application/x-yaml";
    if (lower.endsWith(".json")) return "application/json";
    if (lower.endsWith(".md") || lower.endsWith(".txt") || lower.endsWith(".stemscript")) return "text/plain";
    return "application/octet-stream";
}

const report = {baseUrl, gameFolder, mode: "playground", startedAt: new Date().toISOString(), steps: [], consoleErrors: [], pageErrors: [], assertions: {}};
const failures = [];
function logStep(name, status = "ok", details = {}) {
    report.steps.push({name, status, details, t: new Date().toISOString()});
    const tag = status === "ok" ? "✓" : status === "warn" ? "⚠" : "✗";
    console.log(`${tag} ${name}${Object.keys(details).length ? ` — ${JSON.stringify(details).slice(0, 240)}` : ""}`);
}
function assert(name, cond, detail) {
    report.assertions[name] = {pass: !!cond, detail};
    if (cond) console.log(`✓ assert: ${name}`);
    else { console.log(`✗ assert: ${name} — ${detail ?? ""}`); failures.push(name); }
}

assert("game-folder-exists", existsSync(gameFolder), gameFolder);
if (failures.length) { writeFileSync(resolve(outDir, "report.json"), JSON.stringify(report, null, 2)); process.exit(1); }

const files = walkFiles(gameFolder);
const scriptFile = files.find(f => f.name.toLowerCase().endsWith(".stemscript"));
assert("script-file-found", !!scriptFile, `no .stemscript in ${gameFolder}`);
if (!scriptFile) process.exit(1);
const scriptContent = readFileSync(scriptFile.abs, "utf8");
const folderFiles = files.filter(f => f !== scriptFile)
    .map(f => ({name: f.name, mime: mimeFor(f.name), data: readFileSync(f.abs).toString("base64")}));
logStep("read solar-system folder", "ok", {files: files.length, script: basename(scriptFile.name)});

const browser = await chromium.launch({headless: !headed});
const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
const page = await ctx.newPage();
page.on("console", m => { if (m.type() === "error") report.consoleErrors.push({text: m.text(), location: m.location()}); });
page.on("pageerror", e => report.pageErrors.push({message: e.message, stack: e.stack?.slice(0, 2000)}));

const dismissBootstrap = async () => {
    const bs = page.locator('[aria-labelledby="oss-bootstrap-title"]').first();
    if (await bs.count() && await bs.isVisible().catch(() => false)) {
        await bs.locator('button:has-text("Browser storage")').first().click({timeout: 3000}).catch(() => {});
        await bs.locator('button:has-text("Continue")').first().click({timeout: 5000}).catch(() => {});
        await page.waitForSelector('[aria-labelledby="oss-bootstrap-title"]', {state: "detached", timeout: 5000}).catch(() => {});
        await page.waitForTimeout(400);
    }
};
const dismissTutorial = async () => {
    const gotIt = page.locator('button:has-text("Got It")').first();
    if (await gotIt.count() && await gotIt.isVisible().catch(() => false)) {
        await gotIt.click({timeout: 3000}).catch(() => {});
        await page.waitForTimeout(300);
    }
};

try {
    // === Activate playground mode on the dashboard (sets sessionStorage flag). ===
    await page.goto(baseUrl + "/dashboard?mode=playground", {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    const playgroundActive = await page.evaluate(() => document.documentElement.dataset.playgroundMode === "true");
    assert("playground-mode-active", playgroundActive, "data-playground-mode not set on <html>");

    // === Boot a fresh project (flag persists via sessionStorage). ===
    await page.goto(baseUrl + "/create/project", {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    await page.waitForTimeout(6000);
    await dismissTutorial();
    // The `data-playground-mode` attribute is only applied on the public-site
    // container mount; the editor route persists the flag via sessionStorage.
    const stillPlayground = await page.evaluate(() => {
        try { return window.sessionStorage.getItem("stem.playgroundMode") === "1"; } catch { return false; }
    });
    assert("playground-persists-into-editor", stillPlayground, "playground sessionStorage flag lost after navigation");
    assert("editor-mounted", /\/create\/project/.test(page.url()), `URL: ${page.url()}`);

    // === Open Copilot so `__stemRunScript` is exposed (allowed in playground). ===
    const copilotBtn = page.locator('[data-testid="actionbar-copilot"]').first();
    const cBox = await copilotBtn.boundingBox().catch(() => null);
    if (cBox) await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    else await copilotBtn.click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(2000);
    const hookPresent = await page.evaluate(() => typeof window.__stemRunScript === "function");
    assert("run-script-hook-exposed", hookPresent, "window.__stemRunScript not exposed");
    if (!hookPresent) throw new Error("no stemRunScript");

    // === Run the import. ===
    const execStartUrl = page.url();
    try {
        await page.evaluate(({content, fileList}) =>
            window.__stemRunScript(content, fileList).then(
                () => { window.__stemRunScriptDone = "ok"; },
                err => { window.__stemRunScriptDone = String(err && err.message ? err.message : err); },
            ), {content: scriptContent, fileList: folderFiles});
    } catch (e) {
        logStep("exec evaluate detached (likely navigation)", "warn", {error: e.message.slice(0, 120)});
    }
    await page.waitForLoadState("networkidle", {timeout: 90000}).catch(() => {});
    await page.waitForTimeout(6000);
    const execResult = await page.evaluate(() => window.__stemRunScriptDone ?? null).catch(() => null);
    const execOk = execResult === "ok" || page.url() !== execStartUrl;
    assert("exec-completed", execOk, execResult ?? "no completion signal");
    await page.screenshot({path: resolve(outDir, "01-after-import.png")}).catch(() => {});

    // Errors during the in-editor import (the AttachBehaviorCommand path).
    const importErrors = report.consoleErrors.filter(e => /applyTexture|loadRingTexture|reading 'asset'/i.test(e.text));
    assert("no-texture-errors-during-import", importErrors.length === 0,
        `${importErrors.length}: ${importErrors[0]?.text.slice(0, 160) ?? ""}`);

    // === Save via AppMenu. ===
    await page.locator('[data-testid="topnav-app-menu"]').first().click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(400);
    const save = page.locator("text=Save Project").first();
    if (await save.isVisible().catch(() => false)) { await save.click({timeout: 3000}).catch(() => {}); await page.waitForTimeout(3500); }
    const importedUrl = page.url();
    const sceneId = (importedUrl.match(/\/create\/project\/([^/?#]+)/) || [])[1] || null;
    assert("scene-id-resolved", !!sceneId, `URL: ${importedUrl}`);

    // === Reload through the playground dashboard (the onSceneLoaded path). ===
    await page.goto(baseUrl + "/dashboard?mode=playground", {waitUntil: "domcontentloaded", timeout: 20000}).catch(() => {});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    await page.waitForTimeout(2000);
    const reloadMarkIdx = report.consoleErrors.length; // ignore pre-reload errors

    if (sceneId) {
        const card = page.locator(`[data-scene-id="${sceneId}"]`).first();
        assert("imported-project-listed", (await card.count()) > 0, `data-scene-id="${sceneId}" not found`);
        if (await card.count()) {
            await card.click({timeout: 5000}).catch(() => {});
            await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
            await dismissBootstrap();
            await page.waitForSelector("canvas", {timeout: 30000}).catch(() => {});
            await dismissTutorial();
            await page.waitForTimeout(8000);
            await page.screenshot({path: resolve(outDir, "02-reloaded-playground.png")}).catch(() => {});
            assert("canvas-visible-on-reload", await page.locator("canvas").first().isVisible().catch(() => false), "no canvas after reload");

            const textureErrors = report.consoleErrors.slice(reloadMarkIdx)
                .filter(e => /applyTexture|loadRingTexture|reading 'asset'/i.test(e.text));
            if (textureErrors.length) writeFileSync(resolve(outDir, "texture-errors.json"), JSON.stringify(textureErrors, null, 2));
            logStep("texture errors after playground reload", textureErrors.length ? "warn" : "ok", {count: textureErrors.length});
            assert("no-texture-load-errors-after-playground-reload", textureErrors.length === 0,
                `${textureErrors.length}: ${textureErrors[0]?.text.slice(0, 200) ?? ""}`);
        }
    }

    // === Enter Play and start the game (best-effort, like the sibling test). ===
    const playBtn = page.locator('[data-testid="topnav-play"]').first();
    if (await playBtn.isVisible().catch(() => false)) {
        await playBtn.click({timeout: 3000}).catch(() => {});
        const dontSave = page.locator("button", {hasText: /don['’]t\s*save/i}).first();
        if (await dontSave.count() && await dontSave.isVisible().catch(() => false)) { await dontSave.click({timeout: 3000}).catch(() => {}); await page.waitForTimeout(500); }
        await page.waitForTimeout(3000);
        const startGame = page.locator("#startGameBtn").first();
        try {
            await startGame.waitFor({state: "visible", timeout: 20000});
            await page.waitForFunction(() => { const b = document.getElementById("startGameBtn"); return b && !b.disabled; }, {timeout: 20000});
            await startGame.click({timeout: 5000, force: true});
            logStep("clicked START GAME", "ok");
        } catch (e) { logStep("START GAME never became clickable", "warn", {error: String(e).slice(0, 160)}); }
        await page.waitForTimeout(8000);
        await page.screenshot({path: resolve(outDir, "03-play.png")}).catch(() => {});
        const playErrors = report.consoleErrors.filter(e => /applyTexture|loadRingTexture|reading 'asset'/i.test(e.text));
        assert("no-texture-errors-in-play", playErrors.length === 0, `${playErrors.length}: ${playErrors[0]?.text.slice(0, 160) ?? ""}`);
    } else {
        logStep("Play button not visible — skipping play audit", "warn");
    }
} catch (e) {
    logStep("FATAL", "error", {error: e.message, stack: e.stack?.slice(0, 600)});
    failures.push("fatal:" + e.message);
} finally {
    report.finishedAt = new Date().toISOString();
    report.failures = failures;
    writeFileSync(resolve(outDir, "report.json"), JSON.stringify(report, null, 2));
    console.log(`\n=== Report (playground) ===`);
    console.log(`Console errors:  ${report.consoleErrors.length}`);
    console.log(`Page errors:     ${report.pageErrors.length}`);
    console.log(`Assertions:      ${Object.values(report.assertions).filter(a => a.pass).length}/${Object.keys(report.assertions).length} passed`);
    console.log(`Output dir:      ${outDir}`);
    await browser.close();
    if (failures.length > 0) { console.error(`\nFAIL: ${failures.length} failed: ${failures.join(", ")}`); process.exit(1); }
}
