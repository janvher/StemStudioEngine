#!/usr/bin/env node
/**
 * DIAGNOSTIC (not a smoke): is the pirate-ship import steadily slow, or stuck
 * on one command? Bootstraps playground + OPFS folder store, opens Copilot to
 * expose __stemRunScript, fires the import WITHOUT awaiting, then polls the
 * `[exec-progress] current/total (+dt) line` console breadcrumb + live object
 * count for ~3.5 minutes. Steadily-rising current → slow; frozen current →
 * stuck (the printed line is the culprit command).
 *
 *   bun run dev must be up on PLAYWRIGHT_BASE_URL (default localhost:5173).
 */
import {chromium} from "playwright";
import {readFileSync, readdirSync, statSync} from "node:fs";
import {join} from "node:path";

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const gameFolder = process.env.GAME_FOLDER || "/Users/n/erth/Games-StemScript/Pirate-Ship-Battle-Royal-v1.0";
const OBSERVE_MS = Number(process.env.OBSERVE_MS || 210000); // ~3.5 min
const POLL_MS = 5000;

const MIME = {".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".bin": "application/octet-stream", ".json": "application/json", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".hdr": "image/vnd.radiance", ".yaml": "text/yaml", ".yml": "text/yaml", ".stemscript": "text/plain"};
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

const files = walk(gameFolder);
const scriptFile = files.find(f => f.name.endsWith(".stemscript"));
const scriptContent = readFileSync(scriptFile.abs, "utf8");
const folderFiles = files.filter(f => f !== scriptFile)
    .map(f => ({name: f.name, mime: mimeFor(f.name), data: readFileSync(f.abs).toString("base64")}));
console.log(`[diag] folder=${gameFolder} files=${files.length} script=${scriptFile.name}`);

const progress = []; // {t, current, total, dt, line}
const PROG_RE = /\[exec-progress\] (\d+)\/(\d+) \(\+(\d+)ms\) (.*)/;
const importDiag = []; // raw [import-diag] lines
const DIAG_RE = /\[import-diag\] (START|DONE) +#(\d+)(.*)/;

const browser = await chromium.launch({headless: process.env.HEADED !== "1"});
// Block the app's service worker — a stale SW cache otherwise serves an old
// bundle, defeating any code change under test.
const page = await (await browser.newContext({viewport: {width: 1440, height: 900}, serviceWorkers: "block"})).newPage();
const startWall = Date.now();
page.on("console", m => {
    const t = m.text();
    if (process.env.VERBOSE && (Date.now() - startWall) < (Number(process.env.VERBOSE_MS) || 40000)) {
        console.log(`  [console.${m.type()}] ${t.slice(0, 160)}`);
    }
    const mm = PROG_RE.exec(t);
    if (mm) progress.push({t: Date.now() - startWall, current: +mm[1], total: +mm[2], dt: +mm[3], line: mm[4].slice(0, 80)});
    const dm = DIAG_RE.exec(t);
    if (dm) { importDiag.push(t); console.log(`  [${((Date.now() - startWall) / 1000).toFixed(0)}s]`, t.slice(0, 150)); }
    if (/\[RUNSCRIPT-ENTRY\]|\[phase\]|\[exec-progress\]|\[import-skip\]|\[import-timeout\]|\[ScriptImport\] getAsset/.test(t)) console.log(`  >> [${((Date.now() - startWall) / 1000).toFixed(0)}s]`, t.slice(0, 200));
});

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

await page.goto(baseUrl + "/dashboard?mode=playground", {waitUntil: "domcontentloaded", timeout: 30000});
await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
await dismissBootstrap();
await bootstrapFS(page);
await page.goto(baseUrl + "/create/project", {waitUntil: "domcontentloaded", timeout: 30000});
await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
await dismissBootstrap();
await page.waitForTimeout(6000);
await dismissTutorial();
const copilotBtn = page.locator('[data-testid="actionbar-copilot"]').first();
const cBox = await copilotBtn.boundingBox().catch(() => null);
if (cBox) await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
else await copilotBtn.click({timeout: 3000, force: true}).catch(() => {});
await page.waitForTimeout(2000);
const hookPresent = await page.evaluate(() => typeof window.__stemRunScript === "function");
console.log(`[diag] hook present=${hookPresent}`);
if (!hookPresent) { await browser.close(); process.exit(1); }

// Fire WITHOUT awaiting — we only observe progress.
await page.evaluate(({content, fileList}) => {
    window.__diagDone = null;
    window.__stemRunScript(content, fileList).then(s => { window.__diagDone = {ok: true, summary: s}; }, e => { window.__diagDone = {ok: false, err: String(e && e.message || e)}; });
}, {content: scriptContent, fileList: folderFiles});

const deadline = Date.now() + OBSERVE_MS;
let lastMarker = "", lastChangeT = Date.now();
while (Date.now() < deadline) {
    await page.waitForTimeout(POLL_MS);
    const objCount = await page.evaluate(() => (window.__stemGetScene ? window.__stemGetScene().objectCount : -1)).catch(() => -2);
    const dialogUp = await page.evaluate(() => /Import Assets \(/.test(document.body?.innerText || "")).catch(() => false);
    if (dialogUp) console.log(`  >>> [${((Date.now() - startWall) / 1000).toFixed(0)}s] BATCH IMPORT DIALOG IS OPEN — runScript is blocked awaiting a user click (headless = infinite hang).`);
    const done = await page.evaluate(() => window.__diagDone).catch(() => null);
    const marker = `${objCount}|${(importDiag[importDiag.length - 1] || "")}|${(progress.length ? progress[progress.length - 1].current : "")}`;
    if (marker !== lastMarker) { lastMarker = marker; lastChangeT = Date.now(); }
    const stalledMs = Date.now() - lastChangeT;
    const tSec = ((Date.now() - startWall) / 1000).toFixed(0);
    const lastDiag = importDiag[importDiag.length - 1] || "(no import-diag yet)";
    console.log(`[diag t=${tSec}s] objCount=${objCount} stalledFor=${(stalledMs / 1000).toFixed(0)}s lastDiag="${lastDiag.replace(/^.*\[import-diag\] /, "").slice(0, 90)}"`);
    if (done) { console.log(`[diag] run resolved: ${JSON.stringify(done)}`); break; }
    // Don't break before the in-app per-import timeout (90s) has a chance to
    // fire its [import-timeout] culprit line (~110s wall). Give it headroom.
    if (stalledMs > 140000) { console.log(`[diag] >>> STUCK ${(stalledMs / 1000).toFixed(0)}s (no [import-timeout] seen — unexpected).`); break; }
}

// Summary: slowest commands.
const byDt = [...progress].sort((a, b) => b.dt - a.dt).slice(0, 12);
console.log("\n[diag] slowest commands (dt ms):");
for (const p of byDt) console.log(`   +${p.dt}ms  @${(p.t / 1000).toFixed(0)}s  ${p.current}/${p.total}  ${p.line}`);
console.log(`\n[diag] total progress events=${progress.length}, reached=${lastCurrent}/${progress[0] ? progress[progress.length - 1].total : "?"}`);
await browser.close();
console.log("DIAG_DONE");
