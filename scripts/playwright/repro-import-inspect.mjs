#!/usr/bin/env node
/**
 * Focused regression repro: import a stemscript folder, then introspect the
 * ACTUAL scene + registries to count how many models / behaviors materialized.
 * Unlike oss-import-3dchess.mjs this does not care about save/reload — it asks
 * the engine directly what landed.
 *
 *   GAME_FOLDER=/path/to/game node scripts/playwright/repro-import-inspect.mjs
 */
import {chromium} from "playwright";
import {readFileSync, readdirSync, statSync} from "node:fs";
import {join} from "node:path";

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const gameFolder = process.env.GAME_FOLDER || "/Users/n/erth/Games-StemScript/3d-chess";
const headed = process.env.HEADED === "1";

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
const mimeFor = n =>
    n.endsWith(".yaml") || n.endsWith(".yml") ? "text/yaml"
    : n.endsWith(".json") || n.endsWith(".stemscript") ? "application/json"
    : n.endsWith(".gltf") ? "model/gltf+json"
    : n.endsWith(".glb") ? "model/gltf-binary"
    : n.endsWith(".png") ? "image/png"
    : n.endsWith(".jpg") || n.endsWith(".jpeg") ? "image/jpeg"
    : "application/octet-stream";

const files = walk(gameFolder);
const scriptFile = files.find(f => f.name.toLowerCase().endsWith(".stemscript"));
const scriptContent = readFileSync(scriptFile.abs, "utf8");
const folderFiles = files.filter(f => f !== scriptFile).map(f => ({
    name: f.name, mime: mimeFor(f.name), data: readFileSync(f.abs).toString("base64"),
}));

// What the script *asks* to import.
const wantModels = [...scriptContent.matchAll(/^import model name="([^"]+)"/gm)].map(m => m[1]);
const wantBehaviors = [...scriptContent.matchAll(/^import behavior name="([^"]+)"/gm)].map(m => m[1]);
console.log(`SCRIPT WANTS: ${wantModels.length} models ${JSON.stringify(wantModels)}`);
console.log(`SCRIPT WANTS: ${wantBehaviors.length} behaviors ${JSON.stringify(wantBehaviors)}`);

const browser = await chromium.launch({headless: !headed});
const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
import {writeFileSync as _wf} from "node:fs";
const importLogs = [];
const allLogs = [];
page.on("console", m => {
    const t = m.text();
    allLogs.push(`[${m.type()}] ${t}`);
    if (/ScriptImport|importHandler|dedup|Behavior|model|Failed|Error|throw|exec/i.test(t)) {
        importLogs.push(`[${m.type()}] ${t.slice(0, 300)}`);
    }
});
page.on("pageerror", e => { importLogs.push(`[pageerror] ${e.message}`); allLogs.push(`[pageerror] ${e.message}`); });
process.on("exit", () => { try { _wf("/tmp/repro-all-logs.txt", allLogs.join("\n")); } catch {} });

try {
    await page.goto(baseUrl + "/create/project", {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    const modal = page.locator('[aria-labelledby="oss-bootstrap-title"]').first();
    if (await modal.count() && await modal.isVisible().catch(() => false)) {
        await modal.locator('button:has-text("Browser storage")').first().click({timeout: 3000}).catch(() => {});
        await modal.locator('button:has-text("Continue")').first().click({timeout: 5000}).catch(() => {});
        await page.waitForSelector('[aria-labelledby="oss-bootstrap-title"]', {state: "detached", timeout: 5000}).catch(() => {});
    }
    await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
    await page.waitForTimeout(8000);
    const gotIt = page.locator('button:has-text("Got It")').first();
    if (await gotIt.count() && await gotIt.isVisible().catch(() => false)) await gotIt.click({timeout: 3000}).catch(() => {});

    const copilotBtn = page.locator('[data-testid="actionbar-copilot"]').first();
    const cBox = await copilotBtn.boundingBox();
    if (cBox) await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    else await copilotBtn.click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(2000);

    const hookPresent = await page.evaluate(() => typeof window.__stemRunScript === "function");
    console.log("hook present:", hookPresent);

    await page.evaluate(({content, fileList}) => {
        return window.__stemRunScript(content, fileList).then(
            () => { window.__done = "ok"; },
            err => { window.__done = String(err && err.message ? err.message : err); },
        );
    }, {content: scriptContent, fileList: folderFiles}).catch(() => {});
    await page.waitForLoadState("networkidle", {timeout: 60000}).catch(() => {});
    await page.waitForTimeout(6000);
    console.log("exec done signal:", await page.evaluate(() => window.__done ?? null).catch(() => null));

    // === Save the project so it lands in the ProjectStore ===
    await page.locator('[data-testid="topnav-app-menu"]').first().click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(400);
    const save = page.locator('text=Save Project').first();
    if (await save.isVisible().catch(() => false)) {
        await save.click({timeout: 3000}).catch(() => {});
        await page.waitForTimeout(4000);
    }

    // === Introspect the PERSISTED project (ground truth for reload) ===
    const state = await page.evaluate(async () => {
        const open = () => new Promise((res, rej) => {
            const r = indexedDB.open("stemstudio-projects");
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
        });
        const all = (store, idx, key) => new Promise((res, rej) => {
            const src = idx ? store.index(idx) : store;
            const r = key ? src.getAll(key) : src.getAll();
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
        });
        const db = await open();
        const projects = await all(db.transaction("projects").objectStore("projects"));
        if (!projects.length) return {error: "no projects persisted"};
        projects.sort((a, b) => (b.meta?.updatedAt || 0) > (a.meta?.updatedAt || 0) ? 1 : -1);
        const p = projects[0];
        let scene = p.sceneJson;
        if (typeof scene === "string") { try { scene = JSON.parse(scene); } catch { scene = {}; } }
        // scene is an ARRAY of serialized entries; entry 0 carries options/userData.
        const arr = Array.isArray(scene) ? scene : [];
        const flat = arr.map(e => ({
            gen: e?.metadata?.generator,
            name: e?.name,
            behaviors: e?.userData?.behaviors ? Object.keys(e.userData.behaviors) : undefined,
        }));
        const cfgs = arr.flatMap(e => e?.userData?.behaviorConfigs || []);
        let assets = [];
        try {
            assets = await all(db.transaction("assets").objectStore("assets"), "byProjectId", p.meta.id);
        } catch (e) { assets = [{error: String(e)}]; }
        const byType = {};
        for (const a of assets) { const t = a.type || a.asset?.type || "?"; byType[t] = (byType[t] || 0) + 1; }
        return {
            projectId: p.meta?.id,
            title: p.meta?.title || p.meta?.name,
            persistedObjects: flat,
            persistedObjectCount: flat.length,
            behaviorConfigCount: cfgs.length,
            behaviorConfigs: cfgs.map(c => ({id: c.id, name: c.name})),
            assetCount: assets.length,
            assetsByType: byType,
            assetNames: assets.map(a => ({name: a.name || a.asset?.name, type: a.type || a.asset?.type})),
        };
    });
    console.log("\n=== PERSISTED PROJECT AFTER IMPORT+SAVE ===");
    console.log(JSON.stringify(state, null, 1));
    console.log("\n=== IMPORT-RELATED LOGS ===");
    console.log(importLogs.join("\n"));
} catch (e) {
    console.error("REPRO ERROR:", e);
} finally {
    await browser.close();
}
