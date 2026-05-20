/**
 * Step configuration for import progress tracking.
 */
export interface StepConfig {
    /** Human-readable name of the step */
    name: string;
    /** Weight of this step in overall progress (0-1). All step weights should sum to 1. */
    weight: number;
}

/**
 * Tracks progress across multiple import steps and calculates overall completion.
 *
 * @example
 * ```typescript
 * const steps = [
 *     { name: 'Parsing', weight: 0.1 },
 *     { name: 'Importing', weight: 0.7 },
 *     { name: 'Saving', weight: 0.2 },
 * ];
 * const tracker = new ImportProgressTracker(steps);
 *
 * tracker.setStep(0); // Start parsing
 * tracker.setStepProgress(100); // Parsing complete
 *
 * tracker.setStep(1); // Start importing
 * tracker.setStepProgress(50); // Importing 50% done
 * console.log(tracker.getOverallProgress()); // Returns ~45 (10% + 35%)
 * ```
 */
export class ImportProgressTracker {
    private steps: StepConfig[];
    private currentStepIndex: number = 0;
    private currentStepProgress: number = 0;

    /**
     * Creates a new import progress tracker.
     * @param steps - Array of step configurations. Weights should sum to 1.
     */
    constructor(steps: StepConfig[]) {
        this.steps = steps;

        // Validate that weights sum to approximately 1
        const totalWeight = steps.reduce((sum, step) => sum + step.weight, 0);
        if (Math.abs(totalWeight - 1.0) > 0.01) {
            console.warn(
                `ImportProgressTracker: Step weights sum to ${totalWeight.toFixed(2)}, expected 1.0`,
            );
        }
    }

    /**
     * Sets the current step index.
     * @param stepIndex - Index of the step to set as current (0-based)
     */
    setStep(stepIndex: number): void {
        if (stepIndex < 0 || stepIndex >= this.steps.length) {
            throw new Error(
                `Invalid step index ${stepIndex}. Must be between 0 and ${this.steps.length - 1}`,
            );
        }
        this.currentStepIndex = stepIndex;
        this.currentStepProgress = 0;
    }

    /**
     * Sets the progress of the current step.
     * @param progress - Progress percentage (0-100)
     */
    setStepProgress(progress: number): void {
        this.currentStepProgress = Math.min(100, Math.max(0, progress));
    }

    /**
     * Calculates and returns the overall progress across all steps.
     * @returns Overall progress percentage (0-100)
     */
    getOverallProgress(): number {
        let totalProgress = 0;

        // Add weight from all completed steps
        for (let i = 0; i < this.currentStepIndex; i++) {
            totalProgress += this.steps[i]!.weight;
        }

        // Add partial weight from current step
        const currentStep = this.steps[this.currentStepIndex];
        if (currentStep) {
            totalProgress += currentStep.weight * this.currentStepProgress / 100;
        }

        return Math.round(totalProgress * 100);
    }

    /**
     * Gets a string representation of the current step (e.g., "3/5").
     * @returns Step indicator string
     */
    getCurrentStep(): string {
        return `${this.currentStepIndex + 1}/${this.steps.length}`;
    }

    /**
     * Gets the name of the current step.
     * @returns Name of the current step, or empty string if no step is set
     */
    getCurrentStepName(): string {
        return this.steps[this.currentStepIndex]?.name || '';
    }

    /**
     * Gets the total number of steps.
     * @returns Total step count
     */
    getTotalSteps(): number {
        return this.steps.length;
    }

    /**
     * Gets the current step index (0-based).
     * @returns Current step index
     */
    getCurrentStepIndex(): number {
        return this.currentStepIndex;
    }

    /**
     * Gets the current step progress (0-100).
     * @returns Current step progress percentage
     */
    getCurrentStepProgress(): number {
        return this.currentStepProgress;
    }
}
