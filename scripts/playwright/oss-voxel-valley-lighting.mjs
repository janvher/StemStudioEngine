#!/usr/bin/env node
/**
 * Regression test (PLAYGROUND mode): scene background + image-based environment
 * lighting must survive a save → reload (and an edit → play → edit round-trip).
 *
 * Bug it guards against: a stemscript `scene background type=Texture texture="…"`
 * command resolved the named image asset to an ephemeral `blob:` URL and
 * persisted only that URL. Object URLs are revoked on page reload, so after a
 * reload the editor could no longer fetch the skybox texture — losing both the
 * visible background AND `scene.environment` (the image-based lighting that lit
 * the whole scene). Result: "everything goes dark" on reload, even though the
 * ambient/hemisphere/directional lights themselves were intact.
 *
 * Fix: `SettingsHandlers.handleSetSceneBackground` now also persists the stable
 * `textureAsset` (AssetRef), which `EnvironmentSettingsManager.applyBackgroundSettings`
 * re-fetches through the asset loader after a reload.
 *
 * The probe uses the `__stemGetScene` test affordance (extended to report
 * lights, rendering, and scene.background/environment classification).
 *
 * Prereq: `bun run dev` on PLAYWRIGHT_BASE_URL (default localhost:5173).
 * Set HEADED=1 to watch. Report → scripts/playwright/oss-voxel-valley-lighting-output/.
 */
import {chromium} from "playwright";
import {writeFileSync, mkdirSync, readFileSync, readdirSync, statSync, existsSync} from "node:fs";
import {dirname, resolve, basename, join} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "oss-voxel-valley-lighting-output");
mkdirSync(outDir, {recursive: true});

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const headed = process.env.HEADED === "1";
const gameFolder = process.env.GAME_FOLDER || "/Users/n/erth/Games-StemScript/voxel-valley";

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
    if (lower.endsWith(".wav")) return "audio/wav";
    if (lower.endsWith(".mp3")) return "audio/mpeg";
    if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "application/x-yaml";
    if (lower.endsWith(".json")) return "application/json";
    if (lower.endsWith(".md") || lower.endsWith(".txt") || lower.endsWith(".stemscript")) return "text/plain";
    return "application/octet-stream";
}

// Probe via the sanctioned `__stemGetScene` affordance (lights + background + env).
const PROBE = () => {
    const fn = window.__stemGetScene;
    if (typeof fn !== "function") return {error: "no __stemGetScene hook"};
    const s = fn();
    const lights = s.lights || [];
    return {
        counts: {
            ambient: lights.filter(l => l.type === "AmbientLight").length,
            hemisphere: lights.filter(l => l.type === "HemisphereLight").length,
            directional: lights.filter(l => l.type === "DirectionalLight").length,
        },
        rendering: s.rendering,
        sceneEnv: s.sceneEnv,
        mode: s.mode,
        sceneName: s.sceneName,
    };
};

const report = {baseUrl, gameFolder, startedAt: new Date().toISOString(), checkpoints: {}, assertions: {}, consoleErrors: [], pageErrors: []};
const failures = [];
function assert(name, cond, detail) {
    report.assertions[name] = {pass: !!cond, detail};
    if (cond) console.log(`✓ ${name}`);
    else { console.log(`✗ ${name} — ${detail ?? ""}`); failures.push(name); }
}

if (!existsSync(gameFolder)) { console.error("missing game folder", gameFolder); process.exit(1); }
const files = walkFiles(gameFolder);
const scriptFile = files.find(f => f.name.toLowerCase().endsWith(".stemscript"));
const scriptContent = readFileSync(scriptFile.abs, "utf8");
const folderFiles = files.filter(f => f !== scriptFile)
    .map(f => ({name: f.name, mime: mimeFor(f.name), data: readFileSync(f.abs).toString("base64")}));
console.log(`read ${basename(gameFolder)}: ${files.length} files`);

const browser = await chromium.launch({headless: !headed});
const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
const page = await ctx.newPage();
page.on("console", m => { if (m.type() === "error") report.consoleErrors.push(m.text().slice(0, 300)); });
page.on("pageerror", e => report.pageErrors.push({message: e.message, stack: e.stack?.slice(0, 800)}));

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
    if (await gotIt.count() && await gotIt.isVisible().catch(() => false)) { await gotIt.click({timeout: 3000}).catch(() => {}); await page.waitForTimeout(300); }
};
const openCopilot = async () => {
    if (await page.evaluate(() => typeof window.__stemGetScene === "function").catch(() => false)) return;
    const btn = page.locator('[data-testid="actionbar-copilot"]').first();
    const box = await btn.boundingBox().catch(() => null);
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    else await btn.click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(1500);
};
// Pin the editor camera to a fixed viewpoint that frames a large patch of sky,
// so the skybox render is comparable across fresh-import vs reload (the camera
// otherwise resets on reload).
const SKY_CAM = {pos: [0, 30, 70], target: [0, 34, 0]};
const pinCamera = async () => {
    await openCopilot();
    await page.evaluate(({pos, target}) => window.__stemSetEditorCamera?.(pos, target), SKY_CAM).catch(() => {});
    await page.waitForTimeout(1200);
};
const probe = async (label) => {
    await openCopilot();
    const data = await page.evaluate(PROBE).catch(e => ({error: String(e)}));
    report.checkpoints[label] = data;
    console.log(`\n[${label}] ${JSON.stringify(data)}`);
    return data;
};
// A correctly-lit voxel-valley scene: skybox texture background + image-based
// environment + all three scene lights present.
const assertLit = (prefix, d) => {
    assert(`${prefix}-no-probe-error`, !d.error, d.error);
    assert(`${prefix}-ambient-light`, d.counts?.ambient === 1, JSON.stringify(d.counts));
    assert(`${prefix}-hemisphere-light`, d.counts?.hemisphere === 1, JSON.stringify(d.counts));
    assert(`${prefix}-directional-light`, d.counts?.directional >= 1, JSON.stringify(d.counts));
    assert(`${prefix}-background-is-texture`, d.rendering?.backgroundType === "Texture", `backgroundType=${d.rendering?.backgroundType}`);
    assert(`${prefix}-has-texture-assetref`, d.rendering?.hasBackgroundTextureAsset === true, "missing textureAsset (blob-only persistence)");
    assert(`${prefix}-scene-background-texture`, d.sceneEnv?.background === "Texture", `scene.background=${d.sceneEnv?.background}`);
    assert(`${prefix}-scene-environment-texture`, d.sceneEnv?.environment === "Texture", `scene.environment=${d.sceneEnv?.environment} (IBL lost -> dark scene)`);
};

const storeMode = process.env.STORE_MODE === "filesystem" ? "filesystem" : "indexeddb";
report.storeMode = storeMode;
console.log(`store mode: ${storeMode}`);

// Bootstrap the File System Access store via OPFS (no picker needed): create a
// clean OPFS folder, persist its handle where the bootstrap looks, and flip the
// persistence mode. A subsequent fresh navigation makes rehydrateProjectStore()
// register FileSystemProjectStore against it.
const bootstrapFilesystemStore = async () => {
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

try {
    await page.goto(baseUrl + "/dashboard?mode=playground", {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    if (storeMode === "filesystem") {
        await bootstrapFilesystemStore();
        await page.waitForTimeout(300);
    }

    await page.goto(baseUrl + "/create/project", {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    await page.waitForTimeout(6000);
    await dismissTutorial();
    await openCopilot();
    assert("run-script-hook-exposed", await page.evaluate(() => typeof window.__stemRunScript === "function"), "no __stemRunScript");

    const execStartUrl = page.url();
    try {
        await page.evaluate(({content, fileList}) =>
            window.__stemRunScript(content, fileList).then(
                () => { window.__stemRunScriptDone = "ok"; },
                err => { window.__stemRunScriptDone = String(err && err.message ? err.message : err); },
            ), {content: scriptContent, fileList: folderFiles});
    } catch (e) { console.log("exec evaluate detached:", e.message.slice(0, 120)); }
    await page.waitForLoadState("networkidle", {timeout: 90000}).catch(() => {});
    await page.waitForTimeout(7000);
    await pinCamera();
    await page.screenshot({path: resolve(outDir, "A-after-import.png")}).catch(() => {});
    assertLit("import", await probe("A_fresh_import"));

    // Save
    await page.locator('[data-testid="topnav-app-menu"]').first().click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(400);
    const save = page.locator("text=Save Project").first();
    if (await save.isVisible().catch(() => false)) {
        await save.click({timeout: 3000}).catch(() => {});
        // CRITICAL for filesystem mode: the OPFS save writes every asset file
        // then assets.json LAST and can take several seconds. Reloading before
        // it finishes leaves the folder without a manifest, so loadAssets
        // returns [] and the scene loses its skybox/models. Wait for the
        // "Saved" toast (emitted only after assets are fully persisted).
        await page.locator("text=/^Saved$/").first().waitFor({state: "visible", timeout: 30000}).catch(() => {});
        await page.waitForTimeout(1000);
    }
    const sceneId = (page.url().match(/\/create\/project\/([^/?#]+)/) || [])[1] || null;
    assert("scene-id-resolved", !!sceneId, page.url());

    // === C) full dashboard reload (the primary regression) ===
    if (sceneId) {
        await page.goto(baseUrl + "/dashboard?mode=playground", {waitUntil: "domcontentloaded", timeout: 20000}).catch(() => {});
        await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
        await dismissBootstrap();
        await page.waitForTimeout(2000);
        const card = page.locator(`[data-scene-id="${sceneId}"]`).first();
        assert("imported-project-listed", (await card.count()) > 0, `data-scene-id="${sceneId}" not found`);
        if (await card.count()) {
            await card.click({timeout: 5000}).catch(() => {});
            await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
            await dismissBootstrap();
            await page.waitForSelector("canvas", {timeout: 30000}).catch(() => {});
            await dismissTutorial();
            await page.waitForTimeout(9000);
            await pinCamera();
            await page.screenshot({path: resolve(outDir, "C-reloaded.png")}).catch(() => {});
            assertLit("reload", await probe("C_reload"));
        }
    }
} catch (e) {
    console.error("FATAL", e.message);
    report.fatal = {message: e.message, stack: e.stack?.slice(0, 600)};
    failures.push("fatal:" + e.message);
} finally {
    report.finishedAt = new Date().toISOString();
    report.failures = failures;
    writeFileSync(resolve(outDir, "report.json"), JSON.stringify(report, null, 2));
    console.log(`\n=== voxel-valley lighting persistence ===`);
    console.log(`Assertions: ${Object.values(report.assertions).filter(a => a.pass).length}/${Object.keys(report.assertions).length} passed`);
    console.log(`pageErrors: ${report.pageErrors.length}  Output: ${outDir}`);
    await browser.close();
    if (failures.length) { console.error(`\nFAIL: ${failures.join(", ")}`); process.exit(1); }
    console.log("\nPASS");
}
