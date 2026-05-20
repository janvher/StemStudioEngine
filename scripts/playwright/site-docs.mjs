#!/usr/bin/env node
/**
 * Public-site docs smoke.
 *
 * Verifies the /docs route:
 *   - default route renders the README (Introduction) page
 *   - sidebar nav shows every curated section
 *   - clicking a sidebar link navigates and renders the new markdown
 *   - markdown is converted to HTML (headings + code blocks render)
 *   - relative repo links in the markdown are rewritten to github.com
 */
import {chromium} from "playwright";
import {writeFileSync, mkdirSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "site-docs-output");
mkdirSync(outDir, {recursive: true});

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const headed = process.env.HEADED === "1";

const report = {baseUrl, startedAt: new Date().toISOString(), assertions: {}};
const failures = [];

function assert(name, condition, detail) {
    report.assertions[name] = {pass: !!condition, detail};
    console.log(`${condition ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
    if (!condition) failures.push(name);
}

const browser = await chromium.launch({headless: !headed});
const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();

try {
    await page.goto(`${baseUrl}/docs`, {waitUntil: "domcontentloaded", timeout: 15000});

    await page.waitForSelector(".docs-content h1, .docs-content h2", {timeout: 6000});
    const introHeading = (await page.locator(".docs-content").innerText()).slice(0, 400);
    assert(
        "default doc route renders Introduction",
        /stem\s*studio|open[- ]?source/i.test(introHeading),
        introHeading.slice(0, 120),
    );

    const sectionLabels = await page.locator(".docs-sidebar h5").allInnerTexts();
    assert(
        "sidebar shows curated sections",
        sectionLabels.length >= 4,
        JSON.stringify(sectionLabels),
    );
    assert(
        "sidebar includes Engine section",
        sectionLabels.some((s) => /engine/i.test(s)),
    );

    // Navigate to Architecture
    await page.locator('.docs-sidebar a:has-text("Architecture")').first().click();
    await page.waitForURL(/\/docs\/architecture/, {timeout: 5000});
    await page.waitForSelector(".docs-content h1, .docs-content h2", {timeout: 6000});

    const archCode = await page.locator(".docs-content pre").count();
    assert("architecture page renders code blocks", archCode > 0, `<pre> count=${archCode}`);

    const archUrl = page.url();
    assert("URL is /docs/architecture", /\/docs\/architecture$/.test(archUrl), archUrl);

    // BYOK page — confirm at least one heading rendered + GitHub-rewritten link
    await page.locator('.docs-sidebar a:has-text("BYOK")').first().click();
    await page.waitForURL(/\/docs\/byok/, {timeout: 5000});
    await page.waitForSelector(".docs-content", {timeout: 6000});
    const byokHeadings = await page.locator(".docs-content h1, .docs-content h2").count();
    assert("BYOK page renders headings", byokHeadings > 0);

    const links = await page.locator(".docs-content a").evaluateAll((els) =>
        els.map((e) => e.getAttribute("href") ?? ""),
    );
    const relativeRepoLink = links.find((h) => /^github\.com|^https?:\/\/github\.com|^\/docs\//.test(h));
    void relativeRepoLink;
    const hasGithubRewrite = links.some((h) => h.includes("github.com/"));
    assert("relative repo links rewritten to github.com", hasGithubRewrite, links.slice(0, 4).join(", "));
} catch (e) {
    failures.push(`exception: ${e.message}`);
    console.error(e);
} finally {
    writeFileSync(resolve(outDir, "report.json"), JSON.stringify(report, null, 2));
    await page.screenshot({path: resolve(outDir, "docs.png"), fullPage: true}).catch(() => {});
    await browser.close();
}

if (failures.length) {
    console.error(`\nFAILED: ${failures.length} assertion(s)`);
    process.exit(1);
}
console.log("\nsite docs smoke: PASS");
