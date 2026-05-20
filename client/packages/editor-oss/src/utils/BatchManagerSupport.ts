import * as THREE from "three";
import {WebGPURenderer, RenderTarget, NearestFilter, NoColorSpace} from "three/webgpu";

import BatchManager from "./BatchManager";

let _cachedBatchManagerSupport: boolean | undefined;
let _probePromise: Promise<boolean> | undefined;

/**
 * Synchronous accessor with lazy async probe. Returns the last known result,
 * kicking off a one-time async test on first call. Subsequent calls will
 * return the cached value once ready.
 * @returns {boolean} last known support value (updates asynchronously)
 */
export function isBatchManagerSupported(): boolean {
    if (_cachedBatchManagerSupport !== undefined) return _cachedBatchManagerSupport;
    if (!_probePromise) {
        _probePromise = _probeBatchManagerSupport();
    }
    _cachedBatchManagerSupport = false;
    return _cachedBatchManagerSupport;
}

/**
 * Explicit async probe for callers that can await.
 * @returns {Promise<boolean>} resolves to true when batching is supported
 */
async function isBatchManagerSupportedAsync(): Promise<boolean> {
    if (_cachedBatchManagerSupport !== undefined) return _cachedBatchManagerSupport;
    if (!_probePromise) _probePromise = _probeBatchManagerSupport();
    return _probePromise;
}
void isBatchManagerSupportedAsync();

/**
 * Internal: perform an offscreen WebGPU render to validate BatchManager path.
 * @returns {Promise<boolean>} true if 100 boxes with unique colors are rendered correctly via batched path
 */
async function _probeBatchManagerSupport(): Promise<boolean> {
    try {
        const canvas = document.createElement("canvas");
        const size = 64;
        canvas.width = size;
        canvas.height = size;

        canvas.style.position = "fixed";
        canvas.style.left = "0";
        canvas.style.top = "0";
        canvas.style.zIndex = "10000";
        canvas.style.border = "2px solid red";
        canvas.style.backgroundColor = "white";
        // document.body.appendChild(canvas);

        const renderer = new WebGPURenderer({canvas});
        await renderer.init();

        const scene = new THREE.Scene();
        scene.name = "BatchManagerProbeScene";
        const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);

        const boxes: THREE.Mesh[] = [];
        const boxSize = 0.8;
        const spacing = 1.0;
        const gridSize = 10;
        const colors: number[] = [];

        for (let i = 0; i < 100; i++) {
            const hue = i / 100 * 360;
            const color = new THREE.Color().setHSL(hue / 360, 1.0, 0.5);
            colors.push(color.getHex());

            const box = new THREE.Mesh(
                new THREE.BoxGeometry(boxSize, boxSize, boxSize),
                new THREE.MeshBasicMaterial({color: color.getHex()}),
            );

            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            box.position.set(
                (col - gridSize / 2 + 0.5) * spacing,
                (row - gridSize / 2 + 0.5) * spacing,
                0,
            );

            boxes.push(box);
            scene.add(box);
        }

        scene.updateMatrixWorld(true);

        try {
            const bm = new BatchManager(scene);
            bm.batchSceneMeshes();
        } catch (err) {
            console.error("[BatchManagerSupport] BatchManager failed:", err);
            try {
                renderer.dispose();
            } catch {
                // ignore
            }
            _cachedBatchManagerSupport = false;
            return false;
        }

        // Render into a dedicated render target
        const target = new RenderTarget(size, size, {minFilter: NearestFilter, magFilter: NearestFilter});
        target.texture.colorSpace = NoColorSpace;

        renderer.setSize(size, size, false);
        
        renderer.setRenderTarget(null);
        renderer.setClearColor(0xffffff, 1);
        await renderer.clear();
        await renderer.render(scene, camera);
        
        renderer.setRenderTarget(target);
        await renderer.clear();
        await renderer.render(scene, camera);

        const data = await renderer.readRenderTargetPixelsAsync(target, 0, 0, size, size);
        const pixels =
            data && data.length
                ? data instanceof Uint8Array
                    ? data
                    : new Uint8Array(data)
                : new Uint8Array(4 * size * size);

        const foundColors = new Set<string>();
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i] ?? 0;
            const g = pixels[i + 1] ?? 0;
            const b = pixels[i + 2] ?? 0;
            if (r >= 255 && g >= 255 && b >= 255) continue;
            const colorKey = `${r},${g},${b}`;
            foundColors.add(colorKey);
        }

        const colorThreshold = 100;
        const colorsFound = foundColors.size >= colorThreshold;
        console.log(`[BatchManagerSupport] Found ${foundColors.size}/${colorThreshold} colors. ${colorsFound ? "PASSED" : "FAILED"}`);

        try {
            target.dispose();
        } catch {
            // ignore
        }
        try {
            for (const box of boxes) {
                box.geometry.dispose();
                if (Array.isArray(box.material)) {
                    box.material.forEach(m => m.dispose());
                } else {
                    box.material.dispose();
                }
            }
        } catch {
            // ignore
        }
        try {
            renderer.setRenderTarget(null);
            renderer.dispose();
        } catch {
            // ignore
        }

        _cachedBatchManagerSupport = colorsFound;
        return _cachedBatchManagerSupport;
    } catch (err) {
        console.error("[BatchManagerSupport] Probe failed with error:", err);
        _cachedBatchManagerSupport = false;
        return false;
    }
}
