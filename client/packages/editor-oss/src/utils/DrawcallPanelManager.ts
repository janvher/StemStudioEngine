import Stats from 'stats-gl';
import type { WebGLRenderer } from 'three';

type StatsPanel = InstanceType<typeof Stats.Panel>;

export class DrawcallPanelManager {
    private panel: StatsPanel;
    private history: number[] = [];
    private maxSamples: number;
    private stats: Stats;
    private renderer: WebGLRenderer;
    private running: boolean = false;

    constructor(stats: Stats, renderer: WebGLRenderer, maxSamples = 40) {
        this.stats = stats;
        this.renderer = renderer;
        this.maxSamples = maxSamples;
        this.panel = new Stats.Panel('Drawcalls', '#0ff', '#222');
        this.stats.addPanel(this.panel);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.updateLoop();
    }

    stop() {
        this.running = false;
    }

    private updateLoop = () => {
        if (!this.running) return;
        this.renderer.info.autoReset = false;
        const drawcalls = this.renderer.info.render.calls;

        if (drawcalls > 0) {
            this.history.push(drawcalls);
            if (this.history.length > this.maxSamples) this.history.shift();
            const maxDrawcalls = Math.max(...this.history, 1);
            this.panel.update(drawcalls, maxDrawcalls, 0);
            this.panel.updateGraph(drawcalls, maxDrawcalls);
        }

        this.renderer.info.reset();
        this.renderer.info.render.calls = 0;
        requestAnimationFrame(this.updateLoop);
    };

    reset() {
        this.panel.update(0, 1, 0);
        this.history = [];
    }
}
