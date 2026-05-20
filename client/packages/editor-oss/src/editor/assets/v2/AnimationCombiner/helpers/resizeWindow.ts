import {PerspectiveCamera} from "three";

interface SizeableRenderer {
    setSize: (width: number, height: number) => void;
}

/**
 * Resize camera & renderer to match container size.
 * Works with WebGLRenderer, WebGPURenderer or any custom renderer exposing setSize.
 *
 * @param camera Perspective camera to update aspect & projection.
 * @param container DOM element that hosts the renderer canvas.
 * @param renderer Renderer with a setSize method (WebGL/WebGPU compatible).
 */
export default function resizeWindow(camera: PerspectiveCamera, container: HTMLElement, renderer: SizeableRenderer): void {
    if (!container) return;
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
