#!/usr/bin/env node
/**
 * Capture screenshots for docs/scheduler-and-editor-settings.md.
 *
 * Requires the editor dev server:
 *   bun run dev:editor
 *
 * Optional:
 *   PLAYWRIGHT_BASE_URL=http://localhost:5173
 *   HEADED=1
 */
import {chromium} from "playwright";
import {mkdirSync} from "node:fs";
import {resolve} from "node:path";

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const headed = process.env.HEADED === "1";
const outDir = resolve(process.cwd(), "docs/assets");
mkdirSync(outDir, {recursive: true});

const browser = await chromium.launch({headless: !headed});
const context = await browser.newContext({
    viewport: {width: 1440, height: 1000},
    deviceScaleFactor: 1,
});
const page = await context.newPage();

const shotClip = () => {
    const viewport = page.viewportSize() || {width: 1440, height: 1000};
    return {
        x: Math.max(0, viewport.width - 430),
        y: 64,
        width: Math.min(430, viewport.width),
        height: Math.min(880, viewport.height - 80),
    };
};

async function dismissBootstrapModal() {
    const modal = page.locator('[aria-labelledby="oss-bootstrap-title"]').first();
    if (await modal.count() && await modal.isVisible().catch(() => false)) {
        await modal.locator('button:has-text("Browser storage")').first().click({timeout: 3000}).catch(() => {});
        await modal.locator('button:has-text("Continue")').first().click({timeout: 5000}).catch(() => {});
        await page.waitForSelector('[aria-labelledby="oss-bootstrap-title"]', {state: "detached", timeout: 5000}).catch(() => {});
    }
}

async function dismissTutorialModal() {
    const gotIt = page.locator('button:has-text("Got It")').first();
    if (await gotIt.count() && await gotIt.isVisible().catch(() => false)) {
        await gotIt.click({timeout: 3000}).catch(() => {});
        await page.waitForTimeout(300);
    }
}

async function openProjectTab() {
    await page.locator('[data-testid="leftpanel-tab-project"]').first().click({timeout: 5000, force: true});
    await page.waitForTimeout(500);
    await page.waitForSelector('.ProjectTab', {timeout: 5000});
}

async function openProjectPanel(label, waitForText) {
    await openProjectTab();
    await page.locator('.ProjectTab').locator(`text=${label}`).first().click({timeout: 5000, force: true});
    await page.waitForSelector(`text=${waitForText}`, {timeout: 8000});
}

async function openRenderingPanel() {
    await openProjectPanel("Rendering & Performance", "Quality Presets");
}

async function screenshotViewport(filename) {
    await page.mouse.move(80, 80).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({
        path: resolve(outDir, filename),
    });
    console.log(`captured docs/assets/${filename}`);
}

async function screenshotProjectPanel(label, waitForText, filename) {
    await openProjectPanel(label, waitForText);
    await screenshotRightPanel(filename);
}

async function screenshotRightPanel(filename) {
    await page.mouse.move(80, 80).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({
        path: resolve(outDir, filename),
        clip: shotClip(),
    });
    console.log(`captured docs/assets/${filename}`);
}

async function captureWhereToFindSettings() {
    await openProjectTab();
    await screenshotViewport("editor-project-tab-map.png");
    await screenshotProjectPanel("Project Settings", "Project Details", "project-settings-overview.png");
}

async function captureRenderingPanel() {
    await page.locator('.ProjectTab').locator('text=Rendering & Performance').first().click({timeout: 5000, force: true});
    await page.waitForSelector('text=Quality Presets', {timeout: 8000});

    await screenshotRightPanel("scheduler-settings-overview.png");

    await page.locator('text=Balanced').first().click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(500);
    await screenshotRightPanel("scheduler-quality-presets.png");
    await clickPresetClose();
    await openRenderingPanel();

    await scrollPanel(1150);
    await screenshotRightPanel("scheduler-controls.png");

    await scrollPanel(850);
    await screenshotRightPanel("scheduler-behavior-performance.png");

    await scrollPanel(1100);
    const profilerToggle = page.locator('text=Enable Lambda Profiler').first();
    if (await profilerToggle.count()) {
        await profilerToggle.click({timeout: 3000, force: true}).catch(() => {});
        await page.waitForTimeout(500);
    }
    await screenshotRightPanel("scheduler-lambda-explorer.png");
}

async function scrollPanel(deltaY) {
    const viewport = page.viewportSize() || {width: 1440, height: 1000};
    await page.mouse.move(viewport.width - 220, 500);
    await page.mouse.wheel(0, deltaY);
    await page.waitForTimeout(700);
}

async function clickPresetClose() {
    const viewport = page.viewportSize() || {width: 1440, height: 1000};
    await page.mouse.click(viewport.width - 42, 255).catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(300);
}

try {
    await page.goto(`${baseUrl}/create/project`, {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrapModal();
    await page.waitForTimeout(10000);
    await dismissTutorialModal();
    await captureWhereToFindSettings();
    await captureRenderingPanel();
    await screenshotProjectPanel("Default Scene", "Ambient Lighting", "default-scene-settings.png");
    await screenshotProjectPanel("Directional Light", "Shadow Parameters", "directional-light-settings.png");
} finally {
    await browser.close();
}
