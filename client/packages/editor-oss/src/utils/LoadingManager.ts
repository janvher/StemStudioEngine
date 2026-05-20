/**
 * LoadingManager - Stage-based loading progress tracker
 *
 * Provides weighted, multi-stage progress tracking for scene loading.
 * Fires events compatible with the StemStudioLoader UI component.
 */

export const LoadingMessages = {
    INITIALIZING: "Initializing...",
    LOADING_SCENE: "Loading scene data...",
    CREATING_OBJECTS: "Creating objects...",
    LOADING_ASSETS: "Loading assets...",
    FINALIZING: "Finalizing...",
    STARTING_PLAYER: "Starting player...",
    INITIALIZING_PHYSICS: "Initializing physics...",
    LOADING_BEHAVIORS: "Loading behaviors...",
    LOADING_LAMBDAS: "Loading lambda system...",
    INITIALIZING_BEHAVIORS: "Initializing behaviors...",
    INITIALIZING_LAMBDAS: "Initializing lambdas...",
    COMPLETE: "Ready!",
} as const;

export type LoadingMessage = (typeof LoadingMessages)[keyof typeof LoadingMessages];

interface LoadingStage {
    name: string;
    message: LoadingMessage;
    weight: number;
    progress: number; // 0-1 within this stage
}

interface LoadingStatusEvent {
    progress: number;
    message: string;
    stage: string;
}

export class LoadingManager {
    private stages: LoadingStage[] = [];
    private currentStageIndex = -1;
    private isLoading = false;
    private app: { call?: (event: string, ...args: unknown[]) => void } | null = null;

    constructor(app?: { call?: (event: string, ...args: unknown[]) => void }) {
        this.app = app ?? null;
    }

    setApp(app: { call?: (event: string, ...args: unknown[]) => void }): void {
        this.app = app;
    }

    startLoading(stages?: Array<{ name: string; message: LoadingMessage; weight: number }>): void {
        this.stages = (stages ?? this.getDefaultStages()).map(s => ({
            ...s,
            progress: 0,
        }));
        this.currentStageIndex = 0;
        this.isLoading = true;
        this.fireEvent();
    }

    nextStage(message?: LoadingMessage): void {
        if (!this.isLoading) return;

        // Mark current stage as complete
        const currentStage = this.stages[this.currentStageIndex];
        if (currentStage) {
            currentStage.progress = 1;
        }

        this.currentStageIndex++;

        const nextStage = this.stages[this.currentStageIndex];
        if (nextStage) {
            if (message) {
                nextStage.message = message;
            }
            nextStage.progress = 0;
        }

        this.fireEvent();
    }

    updateStageProgress(progress: number): void {
        if (!this.isLoading || this.currentStageIndex < 0 || this.currentStageIndex >= this.stages.length) return;
        const stage = this.stages[this.currentStageIndex];
        if (stage) {
            stage.progress = Math.max(0, Math.min(1, progress));
        }
        this.fireEvent();
    }

    completeLoading(): void {
        // Mark all stages as complete
        for (const stage of this.stages) {
            stage.progress = 1;
        }
        this.isLoading = false;
        this.fireEvent();
    }

    handleError(error: string): void {
        this.isLoading = false;
        this.app?.call?.(
            "loadingStatus",
            this,
            { progress: this.getProgress(), message: `Error: ${error}`, stage: "error" },
        );
    }

    getProgress(): number {
        if (this.stages.length === 0) return 0;
        const totalWeight = this.stages.reduce((sum, s) => sum + s.weight, 0);
        if (totalWeight === 0) return 0;
        const completedWeight = this.stages.reduce((sum, s) => sum + s.weight * s.progress, 0);
        return Math.round(completedWeight / totalWeight * 100);
    }

    getCurrentMessage(): string {
        const currentStage = this.stages[this.currentStageIndex];
        if (currentStage) {
            return currentStage.message;
        }
        return this.getProgress() >= 100 ? LoadingMessages.COMPLETE : LoadingMessages.INITIALIZING;
    }

    private fireEvent(): void {
        const progress = this.getProgress();
        const message = this.getCurrentMessage();
        const currentStage = this.stages[this.currentStageIndex];
        const stage = currentStage ? currentStage.name : "complete";

        const status: LoadingStatusEvent = { progress, message, stage };

        this.app?.call?.("loadingStatus", this, status);
        // Backward compat: also update the mask progress for StemStudioLoader
        this.app?.call?.("maskProgress", this, progress);
    }

    private getDefaultStages(): Array<{ name: string; message: LoadingMessage; weight: number }> {
        return [
            { name: "init", message: LoadingMessages.INITIALIZING, weight: 0.1 },
            { name: "scene", message: LoadingMessages.LOADING_SCENE, weight: 0.3 },
            { name: "objects", message: LoadingMessages.CREATING_OBJECTS, weight: 0.3 },
            { name: "assets", message: LoadingMessages.LOADING_ASSETS, weight: 0.2 },
            { name: "finalize", message: LoadingMessages.FINALIZING, weight: 0.1 },
        ];
    }
}
