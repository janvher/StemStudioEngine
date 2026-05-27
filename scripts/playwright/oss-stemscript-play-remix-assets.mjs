#!/usr/bin/env node
/**
 * OSS Stemscript Play -> Edit/Remix asset persistence test.
 *
 * Flow per game folder:
 *   1. Import a real Stemscript folder through the same `exec` path used by
 *      the dashboard import flow.
 *   2. Save, reopen from the dashboard, and capture an editor-mode scene audit.
 *   3. Enter Play mode, optionally press START GAME, then switch back through
 *      the visible Edit/Remix control.
 *   4. Fail if the asset library still has assets but visible renderables in
 *      the editor scene drop after the Play -> Edit/Remix transition.
 *
 * Defaults to the local Solar System and Kenny Cars importer folders when they
 * exist. Override with positional folder args or a comma-separated GAME_FOLDERS
 * list. Set CLICK_START_GAME=1 to press the in-game start button before
 * switching back; by default the test only enters Play mode, which exercises
 * the editor teardown/restore path without letting game scripts monopolize the
 * test browser.
 *
 * Prereq: `npm run dev:editor` on PLAYWRIGHT_BASE_URL (default localhost:5173).
 * Set HEADED=1 to watch.
 * Report -> scripts/playwright/oss-stemscript-play-remix-assets-output/.
 */
import {chromium} from "playwright";
import {existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from "node:fs";
import {basename, dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "oss-stemscript-play-remix-assets-output");
mkdirSync(outDir, {recursive: true});

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const headed = process.env.HEADED === "1";
const renderableDropAllowance = Number(process.env.RENDERABLE_DROP_ALLOWANCE ?? "0.05");
const minBaselineRenderables = Number(process.env.MIN_BASELINE_RENDERABLES ?? "4");
const defaultGameFolders = [
    "/Users/n/erth/de-shadow-editor/stemstudio-importer/solar-system",
    "/Users/n/erth/de-shadow-editor/stemstudio-importer/Kenny-Cars-v1",
].filter(existsSync);
const cliGameFolders = process.argv.slice(2).map(value => value.trim()).filter(Boolean);
const gameFolders = (cliGameFolders.length > 0 ? cliGameFolders.join(",") : (process.env.GAME_FOLDERS || process.env.GAME_FOLDER || defaultGameFolders.join(",")))
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

const report = {
    baseUrl,
    gameFolders,
    startedAt: new Date().toISOString(),
    steps: [],
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    assertions: {},
};
const failures = [];

function logStep(name, status = "ok", details = {}) {
    report.steps.push({name, status, details, t: new Date().toISOString()});
    const tag = status === "ok" ? "✓" : status === "warn" ? "⚠" : "✗";
    console.log(`${tag} ${name}${Object.keys(details).length ? ` - ${JSON.stringify(details).slice(0, 240)}` : ""}`);
}

function assert(name, condition, detail) {
    report.assertions[name] = {pass: !!condition, detail};
    if (condition) {
        console.log(`✓ assert: ${name}`);
        return;
    }
    console.log(`✗ assert: ${name} - ${detail ?? ""}`);
    failures.push(name);
}

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
    if (lower.endsWith(".mp3")) return "audio/mpeg";
    if (lower.endsWith(".wav")) return "audio/wav";
    if (lower.endsWith(".ogg")) return "audio/ogg";
    if (lower.endsWith(".mp4")) return "video/mp4";
    if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "application/x-yaml";
    if (lower.endsWith(".json")) return "application/json";
    if (lower.endsWith(".md") || lower.endsWith(".txt") || lower.endsWith(".stemscript")) return "text/plain";
    return "application/octet-stream";
}

function readStemscriptFolder(folder) {
    const files = walkFiles(folder);
    const scriptFile = files.find(file => file.name.toLowerCase().endsWith(".stemscript"));
    if (!scriptFile) throw new Error(`No .stemscript file found in ${folder}`);
    return {
        scriptName: basename(scriptFile.name),
        scriptContent: readFileSync(scriptFile.abs, "utf8"),
        folderFiles: files
            .filter(file => file !== scriptFile)
            .map(file => ({
                name: file.name,
                mime: mimeFor(file.name),
                data: readFileSync(file.abs).toString("base64"),
            })),
    };
}

function countByValue(values) {
    const counts = new Map();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
}

function countMissingBaselineNames(beforeNames, afterNames) {
    const afterCounts = countByValue(afterNames);
    let missing = 0;
    for (const name of beforeNames) {
        const remaining = afterCounts.get(name) ?? 0;
        if (remaining > 0) afterCounts.set(name, remaining - 1);
        else missing += 1;
    }
    return missing;
}

async function dismissBootstrap(page) {
    const modal = page.locator('[aria-labelledby="oss-bootstrap-title"]').first();
    if (!(await modal.count()) || !(await modal.isVisible().catch(() => false))) return;
    await modal.locator('button:has-text("Browser storage")').first().click({timeout: 3000}).catch(() => {});
    await modal.locator('button:has-text("Continue")').first().click({timeout: 5000}).catch(() => {});
    await page.waitForSelector('[aria-labelledby="oss-bootstrap-title"]', {state: "detached", timeout: 5000}).catch(() => {});
    await page.waitForTimeout(500);
}

async function dismissTutorial(page) {
    const gotIt = page.locator('button:has-text("Got It")').first();
    if (await gotIt.count() && await gotIt.isVisible().catch(() => false)) {
        await gotIt.click({timeout: 3000}).catch(() => {});
        await page.waitForTimeout(300);
    }
}

async function openCopilotForTestHooks(page) {
    const copilotBtn = page.locator('[data-testid="actionbar-copilot"]').first();
    const box = await copilotBtn.boundingBox();
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    else await copilotBtn.click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(1500);
    await page.waitForFunction(() => typeof window.__stemRunScript === "function", {timeout: 15000});
}

async function getSceneAudit(page) {
    return page.evaluate(() => window.__stemGetScene?.() ?? null);
}

async function waitForStableEditorAudit(page, caseName, label) {
    await page.waitForFunction(
        () => {
            const audit = window.__stemGetScene?.();
            return audit && audit.mode !== "play" && !audit.isPlaying && audit.visibleRenderableCount > 0;
        },
        {timeout: 45000},
    );

    let previous = null;
    let stable = null;
    for (let i = 0; i < 8; i++) {
        const current = await getSceneAudit(page);
        if (
            previous &&
            current &&
            current.visibleRenderableCount === previous.visibleRenderableCount &&
            current.renderableCount === previous.renderableCount
        ) {
            stable = current;
            break;
        }
        previous = current;
        await page.waitForTimeout(750);
    }

    const audit = stable ?? previous;
    writeFileSync(resolve(outDir, `${caseName}-${label}-audit.json`), JSON.stringify(audit, null, 2));
    return audit;
}

async function saveProject(page) {
    await page.locator('[data-testid="topnav-app-menu"]').first().click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(400);
    const save = page.locator('text=Save Project').first();
    assert("save-button-present", await save.isVisible().catch(() => false), "Save Project not visible");
    if (await save.isVisible().catch(() => false)) {
        await save.click({timeout: 3000}).catch(() => {});
        await page.waitForTimeout(3500);
    }
}

async function runStemscriptImport(page, scriptContent, folderFiles) {
    const execStartUrl = page.url();
    try {
        await page.evaluate(({content, files}) => {
            return window.__stemRunScript(content, files).then(
                () => { window.__stemRunScriptDone = "ok"; },
                err => { window.__stemRunScriptDone = String(err && err.message ? err.message : err); },
            );
        }, {content: scriptContent, files: folderFiles});
    } catch (error) {
        logStep("exec evaluate detached during navigation", "warn", {error: error.message.slice(0, 140)});
    }

    await page.waitForLoadState("networkidle", {timeout: 90000}).catch(() => {});
    await page.waitForTimeout(6000);
    const execResult = await page.evaluate(() => window.__stemRunScriptDone ?? null).catch(() => null);
    const execOk = execResult === "ok" || page.url() !== execStartUrl;
    assert("exec-completed", execOk, execResult ?? "no completion signal");
    if (!execOk) {
        await page.screenshot({path: resolve(outDir, "import-did-not-complete.png")}).catch(() => {});
        throw new Error(`Stemscript import did not complete: ${execResult ?? "no completion signal"}`);
    }
}

async function reopenFromDashboard(page, sceneId) {
    await page.goto(`${baseUrl}/dashboard`, {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap(page);
    await page.waitForTimeout(2500);

    const card = page.locator(`[data-scene-id="${sceneId}"]`).first();
    const cardCount = await card.count();
    assert("imported-project-listed", cardCount > 0, `data-scene-id="${sceneId}" not found`);
    if (!cardCount) return false;

    await card.click({timeout: 5000}).catch(() => {});
    await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
    await dismissBootstrap(page);
    await dismissTutorial(page);
    await page.waitForSelector("canvas", {timeout: 30000});
    await openCopilotForTestHooks(page);
    await page.waitForTimeout(5000);
    return true;
}

async function enterPlayThenReturnToEdit(page, caseName) {
    const playButton = page.locator('[data-testid="topnav-play"]').first();
    assert("topnav-play-visible", await playButton.isVisible().catch(() => false), "topnav Play button not visible");
    await playButton.click({timeout: 5000, force: true}).catch(() => {});

    const dontSave = page.locator("button", {hasText: /don['’]t\s*save/i}).first();
    if (await dontSave.count() && await dontSave.isVisible().catch(() => false)) {
        await dontSave.click({timeout: 3000}).catch(() => {});
    }

    await page.waitForFunction(() => window.__stemGetScene?.()?.mode === "play", {timeout: 45000});
    await page.waitForTimeout(2500);
    await page.locator("canvas").first().screenshot({path: resolve(outDir, `${caseName}-play-canvas.png`)}).catch(() => {});

    if (process.env.CLICK_START_GAME === "1") {
        const startGame = page.locator("#startGameBtn").first();
        if (await startGame.isVisible({timeout: 3000}).catch(() => false)) {
            await startGame.click({timeout: 5000, force: true}).catch(() => {});
            await page.waitForTimeout(3000);
        }
    } else {
        logStep(`${caseName}: skipped START GAME click`, "ok");
    }

    const exitCandidates = page.getByText(/^(Edit|Remix)$/);
    let exitButton = null;
    for (let i = 0; i < await exitCandidates.count(); i++) {
        const candidate = exitCandidates.nth(i);
        if (await candidate.isVisible().catch(() => false)) {
            exitButton = candidate;
            break;
        }
    }
    const exitVisible = !!exitButton;
    assert("play-exit-control-visible", exitVisible, "Edit/Remix control not visible in Play mode");
    if (!exitButton) {
        await page.screenshot({path: resolve(outDir, `${caseName}-missing-play-exit-control.png`)}).catch(() => {});
        throw new Error("Edit/Remix control not visible in Play mode");
    }
    await exitButton.click({timeout: 5000, force: true});

    try {
        await page.waitForFunction(
            () => {
                const audit = window.__stemGetScene?.();
                return audit && audit.mode !== "play" && !audit.isPlaying;
            },
            {timeout: 60000},
        );
    } catch (error) {
        const audit = await getSceneAudit(page).catch(() => null);
        writeFileSync(resolve(outDir, `${caseName}-play-exit-timeout-audit.json`), JSON.stringify(audit, null, 2));
        await page.screenshot({path: resolve(outDir, `${caseName}-play-exit-timeout.png`)}).catch(() => {});
        throw new Error(
            `Play -> Edit/Remix did not return to edit mode: ${error.message}; audit=${JSON.stringify({
                mode: audit?.mode,
                isPlaying: audit?.isPlaying,
                visibleRenderableCount: audit?.visibleRenderableCount,
                assetCount: audit?.assetCount,
            })}`,
        );
    }
    await page.waitForTimeout(5000);
}

async function runCase(browser, folder) {
    const caseName = basename(folder).replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
    const {scriptName, scriptContent, folderFiles} = readStemscriptFolder(folder);
    logStep(`${caseName}: read folder`, "ok", {scriptName, files: folderFiles.length + 1});

    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    const page = await context.newPage();

    page.on("console", message => {
        if (message.type() === "error") {
            report.consoleErrors.push({caseName, text: message.text(), location: message.location()});
        }
    });
    page.on("pageerror", error => {
        report.pageErrors.push({caseName, message: error.message, stack: error.stack?.slice(0, 2000)});
    });
    page.on("requestfailed", request => {
        report.failedRequests.push({caseName, url: request.url(), method: request.method(), failure: request.failure()?.errorText});
    });

    try {
        await page.goto(`${baseUrl}/create/project`, {waitUntil: "domcontentloaded", timeout: 30000});
        await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
        await dismissBootstrap(page);
        await page.waitForTimeout(6000);
        await dismissTutorial(page);
        assert("editor-mounted", /\/create\/project\//.test(page.url()), `URL: ${page.url()}`);

        await openCopilotForTestHooks(page);
        await runStemscriptImport(page, scriptContent, folderFiles);
        await page.screenshot({path: resolve(outDir, `${caseName}-01-after-import.png`)}).catch(() => {});
        await saveProject(page);

        const sceneIdMatch = page.url().match(/\/create\/project\/([^/?#]+)/);
        const sceneId = sceneIdMatch ? sceneIdMatch[1] : null;
        assert("scene-id-resolved", !!sceneId, `URL: ${page.url()}`);
        if (!sceneId) return;

        if (!(await reopenFromDashboard(page, sceneId))) return;

        const baseline = await waitForStableEditorAudit(page, caseName, "baseline");
        await page.locator("canvas").first().screenshot({path: resolve(outDir, `${caseName}-baseline-canvas.png`)}).catch(() => {});
        logStep(`${caseName}: baseline audit`, "ok", {
            visibleRenderableCount: baseline?.visibleRenderableCount,
            renderableCount: baseline?.renderableCount,
            assetCount: baseline?.assetCount,
        });
        assert(
            "baseline-has-renderables",
            (baseline?.visibleRenderableCount ?? 0) >= minBaselineRenderables,
            `visibleRenderableCount=${baseline?.visibleRenderableCount ?? 0}`,
        );
        assert("baseline-has-assets", (baseline?.assetCount ?? 0) > 0, `assetCount=${baseline?.assetCount ?? 0}`);

        await enterPlayThenReturnToEdit(page, caseName);

        const after = await waitForStableEditorAudit(page, caseName, "after-play-edit");
        await page.locator('[data-testid="leftpanel-tab-library"]').first().click({timeout: 3000, force: true}).catch(() => {});
        await page.waitForTimeout(500);
        await page.screenshot({path: resolve(outDir, `${caseName}-after-play-edit.png`)}).catch(() => {});

        const baselineVisible = baseline?.visibleRenderableCount ?? 0;
        const afterVisible = after?.visibleRenderableCount ?? 0;
        const minimumExpected = Math.floor(baselineVisible * (1 - renderableDropAllowance));
        const missingRenderableNames = countMissingBaselineNames(
            baseline?.visibleRenderableNames ?? [],
            after?.visibleRenderableNames ?? [],
        );
        const maxMissingNames = Math.max(1, Math.floor(baselineVisible * renderableDropAllowance));

        logStep(`${caseName}: after Play -> Edit/Remix audit`, "ok", {
            before: baselineVisible,
            after: afterVisible,
            minimumExpected,
            missingRenderableNames,
            assetCount: after?.assetCount,
        });
        assert("assets-still-present-after-play-edit", (after?.assetCount ?? 0) > 0, `assetCount=${after?.assetCount ?? 0}`);
        assert(
            "renderables-preserved-after-play-edit",
            afterVisible >= minimumExpected,
            `before=${baselineVisible}, after=${afterVisible}, minimumExpected=${minimumExpected}`,
        );
        assert(
            "baseline-renderable-names-preserved",
            missingRenderableNames <= maxMissingNames,
            `missing=${missingRenderableNames}, allowed=${maxMissingNames}`,
        );
    } catch (error) {
        logStep(`${caseName}: FATAL`, "error", {error: error.message, stack: error.stack?.slice(0, 600)});
        failures.push(`${caseName}:fatal:${error.message}`);
    } finally {
        await context.close();
    }
}

if (gameFolders.length === 0) {
    assert(
        "game-folders-configured",
        false,
        "Set GAME_FOLDERS=/path/to/game-a,/path/to/game-b or add local importer folders.",
    );
} else {
    for (const folder of gameFolders) {
        assert(`game-folder-exists:${folder}`, existsSync(folder), folder);
    }
}

const browser = await chromium.launch({headless: !headed});
try {
    for (const folder of gameFolders.filter(existsSync)) {
        await runCase(browser, folder);
    }
} finally {
    await browser.close();
    report.finishedAt = new Date().toISOString();
    report.failures = failures;
    writeFileSync(resolve(outDir, "report.json"), JSON.stringify(report, null, 2));
    console.log("\n=== Report ===");
    console.log(`Cases:           ${gameFolders.length}`);
    console.log(`Console errors:  ${report.consoleErrors.length}`);
    console.log(`Page errors:     ${report.pageErrors.length}`);
    console.log(`Failed requests: ${report.failedRequests.length}`);
    console.log(`Assertions:      ${Object.values(report.assertions).filter(a => a.pass).length}/${Object.keys(report.assertions).length} passed`);
    console.log(`Output dir:      ${outDir}`);

    if (failures.length > 0) {
        console.error(`\nFAIL: ${failures.length} failed: ${failures.join(", ")}`);
        process.exit(1);
    }
}
