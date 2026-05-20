import Stats from 'stats-gl';

type StatsPanel = InstanceType<typeof Stats.Panel>;

export class RamPanelManager {
    private panel: StatsPanel;
    private history: number[] = [];
    private maxSamples: number;
    private stats: Stats;
    private running: boolean = false;

    constructor(stats: Stats, maxSamples = 40) {
        this.stats = stats;
        this.maxSamples = maxSamples;
        this.panel = new Stats.Panel('RAM (MB)', '#ff0', '#222');
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

        // Get used JS heap size in MB
        const usedHeapSize = (performance as any).memory?.usedJSHeapSize;
        if (usedHeapSize !== undefined) {
            const usedHeapSizeMB = Math.round(usedHeapSize / (1024 * 1024));

            this.history.push(usedHeapSizeMB);
            if (this.history.length > this.maxSamples) this.history.shift();
            const maxHeapSize = Math.max(...this.history, 1);
            this.panel.update(usedHeapSizeMB, maxHeapSize, 0);
            this.panel.updateGraph(usedHeapSizeMB, maxHeapSize);
        }

        requestAnimationFrame(this.updateLoop);
    };

    reset() {
        this.panel.update(0, 1, 0);
        this.history = [];
    }
}