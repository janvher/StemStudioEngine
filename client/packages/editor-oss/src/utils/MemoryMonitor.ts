import type {WebGLRenderer} from "three";

interface MemoryInfo {
    jsHeapSizeLimit?: number;
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
}

/**
 * Memory Monitor
 *
 * A lightweight memory monitoring.
 * Creates simple HTML panels to display memory statistics.
 */
export class MemoryMonitor {
    private container: HTMLDivElement;
    private renderer: WebGLRenderer;
    private running: boolean = false;
    private updateInterval: number | null = null;

    constructor(renderer: WebGLRenderer) {
        this.renderer = renderer;
        this.container = this.createContainer();
        this.setupStyles();
        document.body.appendChild(this.container);

        // Log memory API availability
        if ("memory" in performance) {
            console.info("[MemoryMonitor] Performance Memory API available ✓");
        } else {
            console.info(
                '[MemoryMonitor] Performance Memory API not available. JS Heap will show "Chrome only". Available in Chrome/Edge/Chromium browsers only.',
            );
        }
    }

    private createContainer(): HTMLDivElement {
        const container = document.createElement("div");
        container.id = "memory-monitor";

        // Create panels
        const panels = [
            {id: "js-heap", label: "JS Heap", color: "#ff8800"},
            {id: "gpu-mem", label: "GPU Est", color: "#ff0088"},
            {id: "textures", label: "Textures", color: "#00ff88"},
            {id: "geometries", label: "Geometry", color: "#0088ff"},
        ];

        panels.forEach(panel => {
            const panelDiv = document.createElement("div");
            panelDiv.className = "memory-panel";
            panelDiv.innerHTML = `
                <div class="memory-label" style="color: ${panel.color}">${panel.label}</div>
                <div class="memory-value" id="${panel.id}-value">0</div>
            `;
            container.appendChild(panelDiv);
        });

        return container;
    }

    private setupStyles(): void {
        const style = document.createElement("style");
        style.textContent = `
            #memory-monitor {
                position: fixed;
                top: 220px;
                left: 20px;
                z-index: 100001;
                background: rgba(0, 0, 0, 0.85);
                border: 1px solid #444;
                padding: 6px 8px;
                font-family: 'Courier New', monospace;
                font-size: 9px;
                line-height: 1.3;
                border-radius: 4px;
                display: none;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
            }
            
            .memory-panel {
                margin-bottom: 2px;
                display: flex;
                justify-content: space-between;
                min-width: 100px;
            }
            
            .memory-panel:last-child {
                margin-bottom: 0;
            }
            
            .memory-label {
                font-weight: var(--theme-font-medium-plus);
                font-size: 8px;
            }
            
            .memory-value {
                color: #fff;
                text-align: right;
                font-size: 9px;
                font-weight: normal;
            }
        `;
        document.head.appendChild(style);
    }

    start(): void {
        if (this.running) return;
        this.running = true;

        this.container.style.display = "block";

        // Update every 500ms
        this.updateInterval = window.setInterval(() => {
            this.updateMemoryStats();
        }, 500);

        // Initial update
        this.updateMemoryStats();
    }

    stop(): void {
        if (!this.running) return;
        this.running = false;

        this.container.style.display = "none";

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    private updateMemoryStats(): void {
        // Update JS Heap
        const memoryInfo = this.getMemoryInfo();
        const jsHeapValue = document.getElementById("js-heap-value");
        if (jsHeapValue) {
            if (memoryInfo && memoryInfo.usedJSHeapSize) {
                const usedHeapMB = (memoryInfo.usedJSHeapSize / (1024 * 1024)).toFixed(1);
                const limitHeapMB = memoryInfo.jsHeapSizeLimit
                    ? (memoryInfo.jsHeapSizeLimit / (1024 * 1024)).toFixed(0)
                    : "?";
                jsHeapValue.textContent = `${usedHeapMB}/${limitHeapMB} MB`;
            } else {
                // Show alternative memory info if available
                const estimatedMemory = this.getEstimatedMemoryUsage();
                jsHeapValue.textContent = estimatedMemory ? `~${estimatedMemory} MB` : "Chrome only";
            }
        }

        // Update GPU Memory stats
        const rendererInfo = this.renderer.info;
        const textureCount = rendererInfo.memory.textures;
        const geometryCount = rendererInfo.memory.geometries;

        // Estimate GPU memory (rough approximation)
        const estimatedGpuMemoryMB = (textureCount * 4 + geometryCount * 0.1).toFixed(1);

        const gpuMemValue = document.getElementById("gpu-mem-value");
        if (gpuMemValue) {
            gpuMemValue.textContent = `${estimatedGpuMemoryMB} MB`;
        }

        const texturesValue = document.getElementById("textures-value");
        if (texturesValue) {
            texturesValue.textContent = `${textureCount}`;
        }

        const geometriesValue = document.getElementById("geometries-value");
        if (geometriesValue) {
            geometriesValue.textContent = `${geometryCount}`;
        }
    }

    private getMemoryInfo(): MemoryInfo | null {
        if ("memory" in performance) {
            return (performance as Performance & { memory: MemoryInfo }).memory;
        }
        return null;
    }

    private getEstimatedMemoryUsage(): number | null {
        // Estimate memory usage based on renderer info
        const info = this.renderer.info;

        // Rough estimation based on:
        // - Number of textures and geometries
        // - WebGL objects count
        const textureEstimate = info.memory.textures * 4; // ~4MB per texture average
        const geometryEstimate = info.memory.geometries * 0.5; // ~0.5MB per geometry average
        const programEstimate = info.programs?.length ? info.programs.length * 0.1 : 0; // ~0.1MB per shader program

        const totalEstimate = textureEstimate + geometryEstimate + programEstimate;

        return totalEstimate > 0 ? Math.round(totalEstimate) : null;
    }

    dispose(): void {
        this.stop();
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
