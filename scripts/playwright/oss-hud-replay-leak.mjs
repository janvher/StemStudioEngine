#!/usr/bin/env node
/**
 * HUD replay diagnostic + regression test.
 *
 * Reproduces the reported bug: "fresh import + Play = fine, but Edit then Play
 * again makes the HUD appear out of nowhere." Drives a fresh Solar System
 * import, then runs two Play sessions with an Edit in between, probing at each
 * step:
 *   - editor.showHUD            (sceneConfig, from meta.showHud)
 *   - scene.userData.game.showHUD (settings-command field)
 *   - #hud-view-container count  (leaked HUDManager root divs)
 *   - #hud-wrapper visible?      (the actual rendered HUD)
 *
 * Assertions: showHUD stays false, the HUD wrapper never becomes visible, and
 * HUDManager containers do not accumulate across Play sessions.
 *
 * Prereq: `bun run dev` on PLAYWRIGHT_BASE_URL (default localhost:5173).
 * Set HEADED=1 to watch. Report → scripts/playwright/oss-hud-replay-leak-output/.
 */
import {chromium} from "playwright";
import {writeFileSync, mkdirSync, readFileSync, readdirSync, statSync, existsSync} from "node:fs";
import {dirname, resolve, basename, join} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "oss-hud-replay-leak-output");
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
    const l = name.toLowerCase();
    if (l.endsWith(".png")) return "image/png";
    if (l.endsWith(".jpg") || l.endsWith(".jpeg")) return "image/jpeg";
    if (l.endsWith(".webp")) return "image/webp";
    if (l.endsWith(".yaml") || l.endsWith(".yml")) return "application/x-yaml";
    if (l.endsWith(".json")) return "application/json";
    if (l.endsWith(".md") || l.endsWith(".txt") || l.endsWith(".stemscript")) return "text/plain";
    return "application/octet-stream";
}

const report = {baseUrl, gameFolder, startedAt: new Date().toISOString(), probes: {}, assertions: {}, consoleErrors: []};
const failures = [];
function assert(name, cond, detail) {
    report.assertions[name] = {pass: !!cond, detail};
    console.log(cond ? `✓ assert: ${name}` : `✗ assert: ${name} — ${detail ?? ""}`);
    if (!cond) failures.push(name);
}

assert("game-folder-exists", existsSync(gameFolder), gameFolder);
if (failures.length) { writeFileSync(resolve(outDir, "report.json"), JSON.stringify(report, null, 2)); process.exit(1); }

const files = walkFiles(gameFolder);
const scriptFile = files.find(f => f.name.toLowerCase().endsWith(".stemscript"));
if (!scriptFile) { console.error("no .stemscript"); process.exit(1); }
const scriptContent = readFileSync(scriptFile.abs, "utf8");
const folderFiles = files.filter(f => f !== scriptFile)
    .map(f => ({name: f.name, mime: mimeFor(f.name), data: readFileSync(f.abs).toString("base64")}));
console.log(`read ${files.length} files (${basename(scriptFile.name)})`);

const browser = await chromium.launch({headless: !headed});
const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
const page = await ctx.newPage();
page.on("console", m => { if (m.type() === "error") report.consoleErrors.push(m.text().slice(0, 200)); });

const dismissBootstrap = async () => {
    const bs = page.locator('[aria-labelledby="oss-bootstrap-title"]').first();
    if (await bs.count() && await bs.isVisible().catch(() => false)) {
        await bs.locator('button:has-text("Browser storage")').first().click({timeout: 3000}).catch(() => {});
        await bs.locator('button:has-text("Continue")').first().click({timeout: 5000}).catch(() => {});
        await page.waitForSelector('[aria-labelledby="oss-bootstrap-title"]', {state: "detached", timeout: 5000}).catch(() => {});
    }
};
const dismissTutorial = async () => {
    const g = page.locator('button:has-text("Got It")').first();
    if (await g.count() && await g.isVisible().catch(() => false)) await g.click({timeout: 3000}).catch(() => {});
};

// Probe the live HUD state from the page.
const probe = async (label) => {
    const data = await page.evaluate(() => {
        const app = window.app || window.global?.app;
        const editor = app?.editor;
        const game = editor?.scene?.userData?.game;
        const containers = document.querySelectorAll("#hud-view-container");
        const wrapper = document.getElementById("hud-wrapper");
        const startBtn = document.getElementById("startGameBtn");
        const wrapperVisible = !!wrapper && wrapper.offsetParent !== null &&
            wrapper.getBoundingClientRect().width > 0 && wrapper.getBoundingClientRect().height > 0;
        return {
            editorShowHUD: editor?.showHUD ?? null,
            gameShowHUD: game?.showHUD ?? null,
            isGame: game?.isGame ?? null,
            isPlaying: app?.isPlaying ?? null,
            hudContainerCount: containers.length,
            hudWrapperPresent: !!wrapper,
            hudWrapperVisible: wrapperVisible,
            startGameBtnPresent: !!startBtn,
        };
    }).catch(e => ({error: String(e)}));
    report.probes[label] = data;
    console.log(`· probe[${label}] ${JSON.stringify(data)}`);
    await page.screenshot({path: resolve(outDir, `${label}.png`)}).catch(() => {});
    return data;
};

const enterPlay = async () => {
    await page.locator('[data-testid="topnav-play"]').first().click({timeout: 5000, force: true}).catch(() => {});
    const dontSave = page.locator("button", {hasText: /don['’]t\s*save/i}).first();
    if (await dontSave.count() && await dontSave.isVisible().catch(() => false)) { await dontSave.click().catch(() => {}); }
    await page.waitForTimeout(6000);
};
const backToEdit = async () => {
    await page.locator("button", {hasText: /^Edit$/}).first().click({timeout: 5000, force: true}).catch(() => {});
    await page.waitForTimeout(4000);
};

try {
    await page.goto(baseUrl + "/create/project", {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    await page.waitForTimeout(6000);
    await dismissTutorial();

    // Open Copilot → expose __stemRunScript.
    const copilotBtn = page.locator('[data-testid="actionbar-copilot"]').first();
    const cBox = await copilotBtn.boundingBox().catch(() => null);
    if (cBox) await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    else await copilotBtn.click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(2000);
    const hookPresent = await page.evaluate(() => typeof window.__stemRunScript === "function");
    assert("run-script-hook-exposed", hookPresent, "no __stemRunScript");
    if (!hookPresent) throw new Error("no stemRunScript");

    // Import.
    try {
        await page.evaluate(({content, fileList}) =>
            window.__stemRunScript(content, fileList).then(() => { window.__d = "ok"; }, e => { window.__d = String(e); }),
            {content: scriptContent, fileList: folderFiles});
    } catch { /* navigation */ }
    await page.waitForLoadState("networkidle", {timeout: 90000}).catch(() => {});
    await page.waitForTimeout(6000);
    await dismissTutorial();
    assert("import-completed", await page.evaluate(() => window.__d === "ok").catch(() => false) || /create\/project\//.test(page.url()), "import did not complete");

    await probe("00-edit-baseline");

    // === Save the project. ===
    await page.locator('[data-testid="topnav-app-menu"]').first().click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(400);
    const save = page.locator("text=Save Project").first();
    if (await save.isVisible().catch(() => false)) { await save.click({timeout: 3000}).catch(() => {}); await page.waitForTimeout(3500); }
    const sceneId = (page.url().match(/\/create\/project\/([^/?#]+)/) || [])[1] || null;
    assert("scene-id-resolved", !!sceneId, `URL: ${page.url()}`);

    // === Reload through the dashboard — this is the path that builds the
    // scene DTO via scene/v2.ts, where `showHud` used to be hardcoded true. ===
    await page.goto(baseUrl + "/dashboard", {waitUntil: "domcontentloaded", timeout: 20000}).catch(() => {});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    await page.waitForTimeout(2000);
    if (sceneId) {
        const card = page.locator(`[data-scene-id="${sceneId}"]`).first();
        assert("imported-project-listed", (await card.count()) > 0, `data-scene-id="${sceneId}" not found`);
        await card.click({timeout: 5000}).catch(() => {});
        await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
        await dismissBootstrap();
        await page.waitForSelector("canvas", {timeout: 30000}).catch(() => {});
        await dismissTutorial();
        await page.waitForTimeout(8000);
    }
    const reloaded = await probe("01-reloaded-edit");

    // === Play session #1 (post-reload) ===
    await enterPlay();
    const play1 = await probe("02-play-1");

    // === Back to Edit, then Play again (the reported replay repro) ===
    await backToEdit();
    const edit1 = await probe("03-edit-after-play-1");
    await enterPlay();
    const play2 = await probe("04-play-2");

    // The HUD start menu (#startGameBtn) and #hud-wrapper only render when
    // showHUD is true. With showHud no longer hardcoded true on load, a
    // non-HUD game must auto-start with no HUD chrome in either Play session.
    assert("no-hud-startmenu-play1", play1.startGameBtnPresent !== true, `play1 startGameBtn present=${play1.startGameBtnPresent}`);
    assert("no-hud-startmenu-play2", play2.startGameBtnPresent !== true, `play2 startGameBtn present=${play2.startGameBtnPresent}`);
    assert("hud-not-visible-play1", play1.hudWrapperVisible !== true, `play1 hud-wrapper visible=${play1.hudWrapperVisible}`);
    assert("hud-not-visible-play2", play2.hudWrapperVisible !== true, `play2 hud-wrapper visible=${play2.hudWrapperVisible}`);
    // The HUD root is torn down on stop via game.reset() -> hud.clear(); it must
    // not accumulate across Play sessions (a stale-root leak would grow the count).
    assert("hud-containers-not-accumulating", (play2.hudContainerCount ?? 0) <= 1,
        `container counts: reloaded=${reloaded.hudContainerCount}, play1=${play1.hudContainerCount}, edit1=${edit1.hudContainerCount}, play2=${play2.hudContainerCount}`);
    console.log(`container counts: reloaded=${reloaded.hudContainerCount}, play1=${play1.hudContainerCount}, edit1=${edit1.hudContainerCount}, play2=${play2.hudContainerCount}`);
} catch (e) {
    console.error("FATAL", e.message);
    failures.push("fatal:" + e.message);
} finally {
    report.finishedAt = new Date().toISOString();
    report.failures = failures;
    writeFileSync(resolve(outDir, "report.json"), JSON.stringify(report, null, 2));
    console.log(`\n=== HUD replay report ===`);
    console.log(`Assertions: ${Object.values(report.assertions).filter(a => a.pass).length}/${Object.keys(report.assertions).length} passed`);
    console.log(`Probes:\n${JSON.stringify(report.probes, null, 2)}`);
    console.log(`Output: ${outDir}`);
    await browser.close();
    if (failures.length) { console.error(`\nFAIL: ${failures.join(", ")}`); process.exit(1); }
}
