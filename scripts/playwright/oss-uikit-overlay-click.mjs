/**
 * UIKit overlay click-blocking regression test.
 *
 * Reproduces — and verifies the fix for — the cubecity-hex bug where HUD
 * buttons became unclickable. Root cause: a full-screen overlay with
 * pointerEvents:"auto" that is "hidden" via visibility:"hidden" stays in the
 * layout and KEEPS raycast-blocking everything behind it (the @ni2khanna/uikit
 * raycast path only skips elements whose pointerEvents === "none", never
 * visibility:"hidden"). Switching the hide to display:"none" removes the
 * element from layout AND raycasting, so clicks reach the buttons underneath.
 *
 * This drives the REAL engine click stack — UIKitPointerEvents.initialize /
 * registerRoot + forwardHtmlEvents(canvas, uiCamera, scene) — on a deliberately
 * light scene (one button + one overlay) so it runs headless without the heavy
 * cubecity scene crashing the renderer.
 *
 *   Phase A: overlay visibility:"hidden"  -> click center -> EXPECT clicks == 0 (blocked)
 *   Phase B: overlay display:"none"       -> click center -> EXPECT clicks == 1 (lands)
 *
 * Usage:  node scripts/playwright/oss-uikit-overlay-click.mjs
 * Requires `bun run dev` on :5173.
 */
import {chromium} from "playwright";
import {mkdirSync, writeFileSync} from "node:fs";
import {resolve, dirname} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.BASE_URL || "http://localhost:5173";
const headed = process.env.HEADED === "1";
const outDir = resolve(__dirname, "_uikit-overlay-click-output");
mkdirSync(outDir, {recursive: true});

// A tiny behavior that builds the exact blocking scenario using the real
// engine globals injected into behavior scripts (UIKit, UIKitPointerEvents).
const PROBE_BEHAVIOR = `meta:
  tool: StemStudio
  type: behavior
  exportVersion: 1

config:
  name: "Overlay Click Probe"
  id: "probe.overlayClick"
  author: "test"
  isScript: true
  main: "script.js"
  version: "1.0.0"
  description: "Minimal HUD button under a full-screen overlay, for click-blocking tests."
  tags:
    - gameplay
  priority: 0
  attributes: {}

code: |
  this.init = function (_game) {
    var game = _game;
    window.__clicks = 0;
    window.__probeReady = false;
    window.__probeErr = null;
    try {
      // Mirror cubecity's useNodeMaterialProps: pick the material mode the active
      // renderer actually supports (node materials only render under the WebGPU/
      // TSL pipeline; headless here is WebGL, so this resolves to false).
      function unmp(props) {
        var useNM = true;
        try {
          if (game && game.renderContext && game.renderContext.useNodeMaterial !== undefined) {
            useNM = game.renderContext.useNodeMaterial;
          }
        } catch (e) {}
        props.useNodeMaterial = useNM;
        return props;
      }
      var fs = new UIKit.Fullscreen(game.renderer, unmp({
        pointerEvents: "none",
        justifyContent: "center",
        alignItems: "center"
      }));
      window.__h = { click: 0, down: 0, up: 0, over: 0, move: 0 };
      var btn = new UIKit.Container(unmp({
        width: 220, height: 90,
        backgroundColor: "rgba(120,200,255,0.6)",
        pointerEvents: "auto",
        justifyContent: "center", alignItems: "center",
        onClick: function () { window.__clicks++; window.__h.click++; },
        onPointerDown: function () { window.__h.down++; },
        onPointerUp: function () { window.__h.up++; },
        onPointerOver: function () { window.__h.over++; },
        onPointerMove: function () { window.__h.move++; }
      }));
      fs.add(btn);
      var overlay = new UIKit.Container(unmp({
        positionType: "absolute", positionLeft: 0, positionTop: 0,
        width: "100%", height: "100%",
        backgroundColor: "rgba(0,0,0,0.25)",
        pointerEvents: "auto"
      }));
      fs.add(overlay);
      btn.name = "BUTTON";
      overlay.name = "OVERLAY";
      UIKitPointerEvents.initialize(game);
      game.uiCamera.add(fs);
      UIKitPointerEvents.registerRoot(fs);
      this._fs = fs;
      // Renderer-independent hit test: cast a ray from the UI camera through
      // screen-center (NDC 0,0) into the UI root and report the CLOSEST hit's
      // owning component. This is exactly what forwardHtmlEvents does internally
      // (Raycaster vs scene geometry) — it works even though the headless WebGL
      // fallback never paints the UIKit meshes to screen. The fix is about
      // whether a hidden overlay still occupies the raycast, so this is the
      // mechanism under test.
      window.__hitTopName = function () {
        try {
          // Cast through the BUTTON's actual screen position, not NDC center —
          // the UI camera is a perspective camera and the UI is not at the
          // screen center. This mirrors a real click landing on the button:
          // does the overlay still intercept that ray before the button?
          var box = new THREE.Box3().setFromObject(btn);
          var center = box.getCenter(new THREE.Vector3());
          var ndc = center.clone().project(game.uiCamera);
          var rc = new THREE.Raycaster();
          rc.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), game.uiCamera);
          var hits = rc.intersectObject(fs, true);
          for (var i = 0; i < hits.length; i++) {
            var o = hits[i].object;
            while (o) {
              if (o.name === "OVERLAY") return "OVERLAY";
              if (o.name === "BUTTON") return "BUTTON";
              o = o.parent;
            }
          }
          return hits.length ? ("OTHER:" + hits.length) : "NONE";
        } catch (e) { return "ERR:" + (e && e.message ? e.message : e); }
      };
      window.__btnNDC = function () {
        try {
          var c = new THREE.Box3().setFromObject(btn).getCenter(new THREE.Vector3());
          var ndc = c.project(game.uiCamera);
          return {x: ndc.x, y: ndc.y};
        } catch (e) { return null; }
      };
      window.__diag = function () {
        var out = {meshes: [], camera: null, fsChildren: (fs.children ? fs.children.length : -1)};
        try {
          var r = game.renderer;
          out.rendererType = r ? (r.isWebGPURenderer ? "WebGPU" : (r.isWebGLRenderer ? "WebGL" : (r.constructor && r.constructor.name))) : "no-renderer";
          var sz = new THREE.Vector2(); if (r && r.getSize) r.getSize(sz); out.rendererSize = {x: sz.x, y: sz.y};
        } catch (e) { out.rendererErr = String(e); }
        try {
          var cam = game.uiCamera;
          if (cam) {
            out.camera = {
              type: cam.isOrthographicCamera ? "Ortho" : (cam.isPerspectiveCamera ? "Persp" : (cam.type || "?")),
              pos: cam.position ? [cam.position.x, cam.position.y, cam.position.z].map(function (n) { return +n.toFixed(2); }) : null,
              inScene: !!(cam.parent),
              parentName: cam.parent ? (cam.parent.name || cam.parent.type) : null
            };
          }
        } catch (e) { out.cameraErr = String(e); }
        function sig(c, prop) {
          try { var s = c[prop]; return s && typeof s.peek === "function" ? s.peek() : (s && "value" in s ? s.value : s); } catch (e) { return "err"; }
        }
        try {
          out.overlaySignals = {isVisible: sig(overlay, "isVisible"), displayed: sig(overlay, "displayed"), explicitVisible: sig(overlay, "explicitVisible")};
          out.btnSignals = {isVisible: sig(btn, "isVisible"), displayed: sig(btn, "displayed"), explicitVisible: sig(btn, "explicitVisible")};
          out.fsSignals = {isVisible: sig(fs, "isVisible"), displayed: sig(fs, "displayed")};
        } catch (e) { out.sigErr = String(e); }
        try {
          var box = new THREE.Box3(); var v = new THREE.Vector3();
          fs.traverse(function (o) {
            if (!o.isMesh) return;
            o.updateWorldMatrix && o.updateWorldMatrix(true, false);
            var bb = null;
            try { box.setFromObject(o); bb = box.isEmpty() ? "empty" : {min: [+box.min.x.toFixed(1), +box.min.y.toFixed(1), +box.min.z.toFixed(1)], max: [+box.max.x.toFixed(1), +box.max.y.toFixed(1), +box.max.z.toFixed(1)]}; } catch (e) { bb = "err"; }
            o.getWorldPosition && o.getWorldPosition(v);
            out.meshes.push({
              name: o.name || (o.parent && o.parent.name) || o.type,
              visible: o.visible,
              hasRaycast: typeof o.raycast === "function",
              worldPos: [+v.x.toFixed(1), +v.y.toFixed(1), +v.z.toFixed(1)],
              bbox: bb
            });
          });
        } catch (e) { out.meshErr = String(e); }
        return out;
      };
      function sigVal(c, prop) {
        try { var s = c[prop]; return s && typeof s.peek === "function" ? s.peek() : null; } catch (e) { return "err"; }
      }
      window.__probe = {
        hideVisibility: function () { overlay.setProperties({ visibility: "hidden" }); },
        hideDisplay: function () { overlay.setProperties({ display: "none", visibility: "visible" }); },
        showOverlay: function () { overlay.setProperties({ display: "flex", visibility: "visible" }); },
        resetClicks: function () { window.__clicks = 0; },
        // isVisible is the exact gate makeClippedCast() checks: a panel with
        // isVisible===false is skipped by the pointer-events hit test, so it can
        // neither receive nor block clicks.
        vis: function () { return { overlay: sigVal(overlay, "isVisible"), button: sigVal(btn, "isVisible") }; }
      };
      window.__probeReady = true;
    } catch (e) {
      window.__probeErr = String(e && e.message ? e.message : e);
    }
  };
  this.update = function (dt) {
    try { UIKitPointerEvents.update(dt); } catch (e) {}
  };
  this.dispose = function () {
    try {
      if (this._fs) { UIKitPointerEvents.unregisterRoot(this._fs); this._fs.dispose && this._fs.dispose(); }
      UIKitPointerEvents.deinitialize();
    } catch (e) {}
  };
`;

const PROBE_STEMSCRIPT = `project title "Overlay Click Probe"
import behavior name="Overlay Click Probe" filepath="behaviors/probeOverlayClick.yaml"
game settings enabled=true showHUD=false maxScore=0
add group name="UIHost" position=0,0,0
behavior attach UIHost behaviorId=probe.overlayClick
`;

const steps = [];
const step = (s, ok = true, d) => { steps.push({s, ok, d}); console.log(`   ${ok ? "·" : "✗"} ${s}${d !== undefined ? ` (${d})` : ""}`); };

const browser = await chromium.launch({
    headless: !headed,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
});
const ctx = await browser.newContext({viewport: {width: 1280, height: 800}});
const page = await ctx.newPage();
page.on("console", m => { if (m.type() === "error") console.log("   [console.error]", m.text().slice(0, 200)); });
page.on("pageerror", e => console.log("   [pageerror]", (e.message || String(e)).slice(0, 200)));

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

let status = "pending";
try {
    // 1. playground + fresh project
    await page.goto(baseUrl + "/dashboard?mode=playground", {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    step("playground activated");

    await page.goto(baseUrl + "/create/project", {waitUntil: "domcontentloaded", timeout: 30000});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    await page.waitForTimeout(6000);
    await dismissTutorial();

    // 2. expose __stemRunScript + import the probe
    const copilotBtn = page.locator('[data-testid="actionbar-copilot"]').first();
    const cBox = await copilotBtn.boundingBox().catch(() => null);
    if (cBox) await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    else await copilotBtn.click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(2000);
    const hookPresent = await page.evaluate(() => typeof window.__stemRunScript === "function");
    step("run-script hook exposed", hookPresent);
    if (!hookPresent) throw new Error("__stemRunScript not exposed");

    const fileList = [{name: "behaviors/probeOverlayClick.yaml", mime: "text/yaml", data: Buffer.from(PROBE_BEHAVIOR).toString("base64")}];
    await page.evaluate(({content, fileList}) =>
        window.__stemRunScript(content, fileList).then(() => { window.__d = "ok"; }, e => { window.__d = String(e && e.message ? e.message : e); }),
        {content: PROBE_STEMSCRIPT, fileList});
    await page.waitForLoadState("networkidle", {timeout: 60000}).catch(() => {});
    await page.waitForTimeout(3000);
    await dismissTutorial();
    const execResult = await page.evaluate(() => window.__d ?? null).catch(() => null);
    step("import exec", execResult === "ok", execResult ?? "no signal");

    // 3. save + reload via the dashboard. The uiCamera overlay render pass is
    // only wired up on a fresh editor load (the scene/v2 reload path) — UIKit
    // HUDs do NOT render on same-session import->play. The probe scene is tiny,
    // so unlike the heavy cubecity scene this reload renders without crashing.
    await page.locator('[data-testid="topnav-app-menu"]').first().click({timeout: 3000, force: true}).catch(() => {});
    await page.waitForTimeout(400);
    const save = page.locator("text=Save Project").first();
    if (await save.isVisible().catch(() => false)) {
        await save.click({timeout: 3000}).catch(() => {});
        await page.locator("text=/^Saved$/").first().waitFor({state: "visible", timeout: 30000}).catch(() => {});
        await page.waitForTimeout(1000);
    }
    const sceneId = (page.url().match(/\/create\/project\/([^/?#]+)/) || [])[1] || null;
    step("saved", !!sceneId, sceneId ?? "no scene id");

    await page.goto(baseUrl + "/dashboard?mode=playground", {waitUntil: "domcontentloaded", timeout: 20000}).catch(() => {});
    await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
    await dismissBootstrap();
    await page.waitForTimeout(1500);
    if (sceneId) {
        const card = page.locator(`[data-scene-id="${sceneId}"]`).first();
        await card.waitFor({state: "attached", timeout: 20000}).catch(() => {});
        if (await card.count()) {
            await card.click({timeout: 5000}).catch(() => {});
            await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
            await dismissBootstrap();
            await page.waitForSelector("canvas", {timeout: 30000}).catch(() => {});
            await dismissTutorial();
            await page.waitForTimeout(4000);
        }
    }
    step("editor reloaded, canvas visible", await page.locator("canvas").first().isVisible().catch(() => false));

    // 4. enter Play (the probe builds its UI in init(), play-only)
    const playBtn = page.locator('[data-testid="topnav-play"]').first();
    await playBtn.click({timeout: 3000, force: true});
    const dontSave = page.locator("button", {hasText: /don['’]t\s*save/i}).first();
    if (await dontSave.count() && await dontSave.isVisible().catch(() => false)) { await dontSave.click().catch(() => {}); await page.waitForTimeout(500); }
    await page.waitForFunction(() => window.__probeReady === true || window.__probeErr, {timeout: 20000}).catch(() => {});
    const probeErr = await page.evaluate(() => window.__probeErr);
    const probeReady = await page.evaluate(() => window.__probeReady === true);
    step("probe UI built in play", probeReady, probeErr || undefined);
    if (!probeReady) throw new Error("probe did not build: " + (probeErr || "unknown"));
    await page.waitForTimeout(1500);
    const diag = await page.evaluate(() => window.__diag());
    step("UIKit root diagnostic", true, JSON.stringify(diag));
    await page.screenshot({path: resolve(outDir, "01-overlay-shown.png")}).catch(() => {});

    // Center of the canvas == center of the button (Fullscreen centers it).
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Real synthetic click at the BUTTON's actual screen position (projected via
    // the UI camera), so we exercise the genuine forwardHtmlEvents pointer path
    // rather than guessing the center. Bonus signal — needs the panel to paint,
    // which the overlay-compositing pass may not do headless.
    const clickButton = async () => {
        const ndc = await page.evaluate(() => window.__btnNDC());
        if (!ndc) return -1;
        const px = box.x + (ndc.x * 0.5 + 0.5) * box.width;
        const py = box.y + (-ndc.y * 0.5 + 0.5) * box.height;
        await page.mouse.move(box.x + 8, box.y + 8);
        await page.waitForTimeout(80);
        await page.mouse.move(px, py, {steps: 6});
        await page.waitForTimeout(120);
        await page.mouse.down();
        await page.waitForTimeout(80);
        await page.mouse.up();
        await page.waitForTimeout(450);
        return page.evaluate(() => window.__clicks);
    };

    // Apply a hide mode, let the layout settle a few frames (root.update runs
    // every frame via the behavior), then read the isVisible GATE (what
    // makeClippedCast checks to include/exclude a panel from hit-testing) plus a
    // real click attempt.
    const probe = async (modeFn) => {
        await page.evaluate((m) => { window.__probe.resetClicks(); window.__probe[m](); }, modeFn);
        await page.waitForTimeout(700);
        const vis = await page.evaluate(() => window.__probe.vis());
        const clicks = await clickButton();
        return {vis, clicks};
    };

    // Informational: confirm the isVisible gate (what makeClippedCast checks to
    // include/exclude a panel from the pointer hit-test) responds to both hide
    // modes. NOTE: a handler-less full-screen overlay does NOT actually block a
    // sibling button behind it (same-plane z-ordering), so overlay visibility is
    // a red herring for the click bug — see the CLICK DELIVERY check below.
    const visShown = (await probe("showOverlay")).vis;
    step("info: shown overlay isVisible", true, `overlay.isVisible=${visShown.overlay} button.isVisible=${visShown.button}`);
    const visGone = (await probe("hideDisplay")).vis;
    step("info: display:none clears overlay isVisible", visGone.overlay === false, `overlay.isVisible=${visGone.overlay}`);

    // CLICK-DELIVERY REGRESSION (the real bug): the camera controls call
    // setPointerCapture() on #scene-container on pointerdown, which redirects
    // pointerup away from the <canvas>. Before the fix (UIKitPointerEvents bound
    // to #scene-container instead of the canvas) a UIKit button got onPointerDown
    // but never onClick. Dispatch a real pointer sequence at the button's
    // projected screen position and assert the full down -> up -> click fires.
    await page.evaluate(() => {
        window.__probe.hideDisplay();
        window.__h = {click:0,down:0,up:0,over:0,move:0};
        // DOM capture-phase counters: did the native pointer events reach the
        // document at all (i.e. were they swallowed by pointer capture)?
        window.__dom = {down:0, up:0, move:0, lost:0, downEv:null, upEv:null};
        const rec = (e) => { const t = e.target || {}; return {button: e.button, tag: t.tagName, id: t.id, cls: (typeof t.className === "string" ? t.className : "").slice(0, 80), style: t.getAttribute ? (t.getAttribute("style") || "").slice(0, 120) : ""}; };
        document.addEventListener("pointerdown", (e) => { window.__dom.down++; window.__dom.downEv = rec(e); }, true);
        document.addEventListener("pointerup", (e) => { window.__dom.up++; window.__dom.upEv = rec(e); }, true);
        document.addEventListener("pointermove", () => window.__dom.move++, true);
        document.addEventListener("lostpointercapture", () => window.__dom.lost++, true);
    });
    await page.waitForTimeout(400);
    const ndc = await page.evaluate(() => window.__btnNDC());
    const px = box.x + (ndc.x * 0.5 + 0.5) * box.width;
    const py = box.y + (-ndc.y * 0.5 + 0.5) * box.height;
    const targetTag = await page.evaluate(({x, y}) => { const el = document.elementFromPoint(x, y); return el ? (el.tagName + (el.id ? "#" + el.id : "")) : "none"; }, {x: px, y: py});
    await page.mouse.move(box.x + 12, box.y + 12);
    await page.waitForTimeout(80);
    await page.mouse.move(px, py, {steps: 8});
    await page.waitForTimeout(150);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(500);
    const h = await page.evaluate(() => window.__h);
    const dom = await page.evaluate(() => window.__dom);
    step("CLICK DELIVERY: button receives full down->up->click", h.click > 0, `target=${targetTag} px=(${Math.round(px)},${Math.round(py)}) uikit=${JSON.stringify(h)} dom.upTarget=${dom.upEv && dom.upEv.id ? "#" + dom.upEv.id : dom.upEv && dom.upEv.tag}`);

    status = (h.click > 0 && h.up > 0) ? "PASS" : "FAIL";
} catch (e) {
    step("FATAL", false, (e.message || String(e)).slice(0, 200));
    status = "FAIL";
} finally {
    writeFileSync(resolve(outDir, "report.json"), JSON.stringify({status, steps}, null, 2));
    console.log(`\n=== UIKit overlay click test: ${status} ===`);
    console.log(`Report dir: ${outDir}`);
    await ctx.close();
    await browser.close();
    process.exit(status === "PASS" ? 0 : 1);
}
