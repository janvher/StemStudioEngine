#!/usr/bin/env node
/**
 * Regression check for the Save-button-disappears-on-reopen bug.
 *
 * STR:
 *   1. Create a new game from scratch.
 *   2. Make a change, save it.
 *   3. Return to the dashboard, reopen the same game.
 *   4. The Save button must still be visible.
 *
 * Root cause was in TopMenu.tsx: the `canSave` re-evaluation paths
 * (`loadCurrentState` + the ownership useEffect) lacked the `IS_OSS`
 * escape that the initial `useState` had, so reopening a saved project
 * (which now carries a real `projectUserId`) recomputed `canSave=false`.
 *
 * Requires `bun run dev` on :5173. Set HEADED=1 to watch.
 */
import {chromium} from "playwright";
import {mkdirSync, writeFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "oss-save-button-reopen-output");
mkdirSync(outDir, {recursive: true});

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const headed = process.env.HEADED === "1";
const failures = [];

function assert(name, condition, detail) {
    if (condition) {
        console.log(`✓ ${name}`);
    } else {
        console.log(`✗ ${name} — ${detail ?? ""}`);
        failures.push(name);
    }
}
const log = m => console.log(`· ${m}`);

const browser = await chromium.launch({headless: !headed});
const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();

// The Save button is a StyledButton whose only text is exactly "Save".
const saveButton = () => page.getByRole("button", {name: "Save", exact: true}).first();

async function dismissTutorialModal() {
    const gotIt = page.locator('button:has-text("Got It")').first();
    if ((await gotIt.count()) && (await gotIt.isVisible().catch(() => false))) {
        await gotIt.click({timeout: 3000}).catch(() => {});
        await page.waitForTimeout(400);
    }
}

try {
    // === 1. Create dashboard + bootstrap modal ===
    // `/` is the marketing site; the editor dashboard lives at `/create`.
    await page.goto(baseUrl + "/create", {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    const modal = page.locator('[aria-labelledby="oss-bootstrap-title"]').first();
    if ((await modal.count()) && (await modal.isVisible().catch(() => false))) {
        await modal.locator('button:has-text("Browser storage")').first().click({timeout: 3000}).catch(() => {});
        await modal.locator('button:has-text("Continue")').first().click({timeout: 5000}).catch(() => {});
        await page.waitForSelector('[aria-labelledby="oss-bootstrap-title"]', {state: "detached", timeout: 5000}).catch(() => {});
        await page.waitForTimeout(800);
    }
    log("home loaded");

    // === 2. New game from scratch ===
    await page.locator('[data-testid="home-scratch-button"]').first().click({timeout: 5000}).catch(() => {});
    await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
    await page.waitForTimeout(10000);
    const url = page.url();
    const sceneId = (url.match(/\/create\/project\/([^/?#]+)/) || [])[1] || null;
    assert("new-game-created", !!sceneId, `URL: ${url}`);
    await dismissTutorialModal();

    // The Save button must be present on a fresh game (control case).
    assert("save-button-visible-on-new-game", await saveButton().isVisible().catch(() => false), "Save button missing on new game");
    await page.screenshot({path: resolve(outDir, "01-new-game.png")}).catch(() => {});

    // === 3. Make a change — add a cube ===
    const libraryTab = page.locator('[data-testid="leftpanel-tab-library"]').first();
    if (await libraryTab.isVisible().catch(() => false)) {
        await libraryTab.click({timeout: 3000, force: true}).catch(() => {});
        await page.waitForTimeout(500);
    }
    const cubeIcon = page.locator('[data-testid="icon-item-cube"]').first();
    if (await cubeIcon.isVisible().catch(() => false)) {
        await cubeIcon.click({timeout: 3000, force: true}).catch(() => {});
        await page.waitForTimeout(1000);
    }
    log("added a cube");

    // === 4. Save ===
    const sb = saveButton();
    if (await sb.isVisible().catch(() => false)) {
        await sb.click({timeout: 3000, force: true}).catch(() => {});
    } else {
        // fall back to AppMenu → Save Project
        await page.locator('[data-testid="topnav-app-menu"]').first().click({timeout: 3000, force: true}).catch(() => {});
        await page.waitForTimeout(400);
        await page.locator('text=Save Project').first().click({timeout: 3000}).catch(() => {});
    }
    await page.waitForTimeout(2500);
    log("first save done");
    await page.screenshot({path: resolve(outDir, "02-after-save.png")}).catch(() => {});

    // === 5. Back to dashboard ===
    await page.goto(baseUrl + "/dashboard", {waitUntil: "domcontentloaded", timeout: 20000}).catch(() => {});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await page.waitForTimeout(3000);

    // === 6. Reopen the same game ===
    const card = page.locator(`[data-scene-id="${sceneId}"]`).first();
    assert("saved-game-listed", (await card.count()) > 0, `no card for scene ${sceneId}`);
    await card.click({timeout: 5000}).catch(() => {});
    await page.waitForLoadState("networkidle", {timeout: 20000}).catch(() => {});
    await page.waitForTimeout(9000);
    await dismissTutorialModal();
    await page.screenshot({path: resolve(outDir, "03-reopened.png")}).catch(() => {});

    // === 7. THE ASSERTION — Save button must still be there ===
    const visibleAfterReopen = await saveButton().isVisible().catch(() => false);
    assert("save-button-visible-after-reopen", visibleAfterReopen, "Save button missing after reopening saved game — regression");

    // And it must be functionally enabled, not just rendered.
    if (visibleAfterReopen) {
        const enabled = await saveButton().isEnabled().catch(() => false);
        assert("save-button-enabled-after-reopen", enabled, "Save button present but disabled after reopen");
    }
} catch (e) {
    console.log(`✗ FATAL — ${e.message}`);
    failures.push("fatal:" + e.message);
} finally {
    writeFileSync(resolve(outDir, "result.json"), JSON.stringify({failures, finishedAt: new Date().toISOString()}, null, 2));
    await browser.close();
    if (failures.length) {
        console.error(`\nFAIL: ${failures.join(", ")}`);
        process.exit(1);
    }
    console.log("\nPASS: Save button stays visible after reopening a saved game.");
}
