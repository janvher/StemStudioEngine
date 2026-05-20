import {CommandsRegistry} from "./CommandsRegistry";
import {normalizeCommandParameters} from "./parameterNormalization";
import {ExecutionStep, InteractiveResult} from "./types/ACPTypes";

/**
 * CommandsExecutor
 *
 * Responsible for executing commands from the AI Agent.
 * Handles command validation, execution, error handling, and result tracking.
 */
export class CommandsExecutor {
    private registry: CommandsRegistry;
    private executionHistory: ExecutionRecord[] = [];
    private currentExecution: ExecutionStep | null = null;
    private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
    private pendingInteractiveResults: Map<
        string,
        {
            resolve: (results: CommandExecutionResult[]) => void;
            reject: (error: any) => void;
            interactiveResult: InteractiveResult;
        }
    > = new Map();

    constructor(registry: CommandsRegistry) {
        this.registry = registry;
    }

    /**
     * Subscribe to executor events
     * @param event
     * @param handler
     */
    on(event: "interactiveResult", handler: (data: InteractiveResult) => void): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);
    }

    /**
     * Unsubscribe from executor events
     * @param event
     * @param handler
     */
    off(event: "interactiveResult", handler: (data: InteractiveResult) => void): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    /**
     * Emit an event
     * @param event
     * @param data
     */
    private emit(event: string, data: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }

    /**
     * Wait for user selection result on an interactive result
     * @param interactiveResult
     */
    private async waitForUserSelectionResult(interactiveResult: InteractiveResult): Promise<CommandExecutionResult[]> {
        return new Promise((resolve, reject) => {
            this.pendingInteractiveResults.set(interactiveResult.id, {
                resolve,
                reject,
                interactiveResult,
            });

            // Emit to UI
            this.emit("interactiveResult", interactiveResult);

            // Timeout after 5 minutes
            setTimeout(
                () => {
                    if (this.pendingInteractiveResults.has(interactiveResult.id)) {
                        this.pendingInteractiveResults.delete(interactiveResult.id);
                        reject(new Error("User selection timeout"));
                    }
                },
                5 * 60 * 1000,
            );
        });
    }

    /**
     * Handle user selection result response
     * @param interactiveId - The ID of the interactive result
     * @param results - The execution results from user's selection
     */
    handleUserSelectionResult(interactiveId: string, results: CommandExecutionResult[]): boolean {
        const pending = this.pendingInteractiveResults.get(interactiveId);
        if (pending) {
            pending.resolve(results);
            this.pendingInteractiveResults.delete(interactiveId);
            return true;
        }
        return false;
    }

    /**
     * Check if there are pending interactive results
     */
    hasPendingInteractiveResults(): boolean {
        return this.pendingInteractiveResults.size > 0;
    }

    /**
     * Get all pending interactive results
     */
    getPendingInteractiveResults(): InteractiveResult[] {
        return Array.from(this.pendingInteractiveResults.values()).map(p => p.interactiveResult);
    }

    /**
     * Execute a single command
     * @param commandName
     * @param parameters
     * @param stepId
     */
    async executeCommand(
        commandName: string,
        parameters: Record<string, any>,
        stepId?: string,
    ): Promise<CommandExecutionResult> {
        const normalizedParameters = normalizeCommandParameters(commandName, parameters);
        const startTime = Date.now();
        const step: ExecutionStep = {
            id: stepId || this.generateStepId(),
            command: commandName,
            parameters: normalizedParameters,
            status: "executing",
        };

        this.currentExecution = step;

        try {
            // Get command from registry
            const command = this.registry.getCommand(commandName);
            if (!command) {
                throw new Error(`Unknown command: ${commandName}`);
            }

            // Validate parameters
            this.validateParameters(command.parameters, normalizedParameters);

            // Execute command
            const result = await command.handler(normalizedParameters);

            // Check if result contains interactive data
            if (result.interactive) {
                // Wait for user selection result (UI will execute commands and return results)
                const executionResults = await this.waitForUserSelectionResult(result.interactive);

                // Update result with the execution results from UI
                result.userInteractionData = executionResults;
                result.interactive = undefined; // Clear interactive data after processing
            }

            // Update step status
            step.status = "completed";
            step.result = result;

            // Record execution
            this.recordExecution({
                step,
                startTime,
                endTime: Date.now(),
                success: true,
            });

            return {
                success: true,
                step,
                result,
            };
        } catch (error: any) {
            step.status = "failed";
            step.error = error.message;

            this.recordExecution({
                step,
                startTime,
                endTime: Date.now(),
                success: false,
                error: error.message,
            });

            return {
                success: false,
                step,
                error: error.message,
            };
        } finally {
            this.currentExecution = null;
        }
    }

    /**
     * Execute multiple commands in sequence (execution plan)
     * @param steps
     * @param onProgress
     */
    async executeCommandBatch(
        steps: ExecutionStep[],
        onProgress?: (step: ExecutionStep, index: number, total: number) => void,
    ): Promise<BatchExecutionResult> {
        const results: CommandExecutionResult[] = [];
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i]!;

            // Notify progress
            onProgress?.(step, i + 1, steps.length);

            // Execute command
            const result = await this.executeCommand(step.command, step.parameters, step.id);

            results.push(result);

            if (result.success) {
                successCount++;
            } else {
                failureCount++;

                // Stop execution on critical errors (optional behavior)
                // Could be made configurable
                if (this.isCriticalError(result.error)) {
                    break;
                }
            }
        }

        return {
            results,
            successCount,
            failureCount,
            totalSteps: steps.length,
            completedSteps: successCount + failureCount,
        };
    }

    /**
     * Validate command parameters against the schema
     * @param schema
     * @param parameters
     */
    private validateParameters(
        schema: Array<{name: string; type: string; required: boolean; enum?: any[]}>,
        parameters: Record<string, any>,
    ): void {
        // Check for unsupported parameters
        const knownParams = new Set(schema.map(p => p.name));
        const unsupported = Object.keys(parameters).filter(key => !knownParams.has(key));
        if (unsupported.length > 0) {
            throw new Error(
                `Unsupported parameter${unsupported.length > 1 ? "s" : ""} "${unsupported.join('", "')}" for this command. Supported parameters: ${[...knownParams].join(", ")}`,
            );
        }

        // Check required parameters
        for (const param of schema) {
            if (param.required && !(param.name in parameters)) {
                throw new Error(`Missing required parameter: ${param.name}`);
            }

            // Type validation
            if (param.name in parameters) {
                const value = parameters[param.name];
                const actualType = Array.isArray(value) ? "array" : typeof value;

                if (actualType !== param.type && value !== null && value !== undefined) {
                    throw new Error(
                        `Invalid type for parameter ${param.name}: expected ${param.type}, got ${actualType}`,
                    );
                }

                // Enum validation
                if (param.enum && !param.enum.includes(value)) {
                    throw new Error(
                        `Invalid value for parameter ${param.name}: must be one of ${param.enum.join(", ")}`,
                    );
                }
            }
        }
    }

    /**
     * Check if an error is critical and should stop execution
     * @param error
     */
    private isCriticalError(error?: string): boolean {
        if (!error) return false;

        const criticalPatterns = ["scene not loaded", "application not initialized", "fatal error"];

        return criticalPatterns.some(pattern => error.toLowerCase().includes(pattern));
    }

    /**
     * Generate a unique step ID
     */
    private generateStepId(): string {
        return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Record execution in history
     * @param record
     */
    private recordExecution(record: ExecutionRecord): void {
        this.executionHistory.push(record);

        // Keep only last 100 executions to prevent memory issues
        if (this.executionHistory.length > 100) {
            this.executionHistory.shift();
        }
    }

    /**
     * Get execution history
     */
    getExecutionHistory(): ExecutionRecord[] {
        return [...this.executionHistory];
    }

    /**
     * Get currently executing step
     */
    getCurrentExecution(): ExecutionStep | null {
        return this.currentExecution;
    }

    /**
     * Clear execution history
     */
    clearHistory(): void {
        this.executionHistory = [];
    }

    /**
     * Undo the last successful command execution
     * (This would require implementing undo functionality in commands)
     */
    async undoLastExecution(): Promise<boolean> {
        // Find last successful execution
        const lastSuccess = [...this.executionHistory].reverse().find(record => record.success);

        if (!lastSuccess) {
            return false;
        }

        // TODO: Implement undo logic
        // This would require commands to support undo operations
        console.warn("Undo functionality not yet implemented");
        return false;
    }

    /**
     * Get execution statistics
     */
    getStatistics(): ExecutionStatistics {
        const total = this.executionHistory.length;
        const successful = this.executionHistory.filter(r => r.success).length;
        const failed = total - successful;

        const executionTimes = this.executionHistory.map(r => r.endTime - r.startTime);
        const avgExecutionTime =
            executionTimes.length > 0 ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length : 0;

        const commandCounts = new Map<string, number>();
        this.executionHistory.forEach(record => {
            const count = commandCounts.get(record.step.command) || 0;
            commandCounts.set(record.step.command, count + 1);
        });

        return {
            totalExecutions: total,
            successfulExecutions: successful,
            failedExecutions: failed,
            successRate: total > 0 ? successful / total : 0,
            averageExecutionTime: avgExecutionTime,
            commandUsage: Object.fromEntries(commandCounts),
        };
    }
}

// Types
export interface CommandExecutionResult {
    success: boolean;
    step: ExecutionStep;
    result?: any;
    error?: string;
}

export interface BatchExecutionResult {
    results: CommandExecutionResult[];
    successCount: number;
    failureCount: number;
    totalSteps: number;
    completedSteps: number;
}

export interface ExecutionRecord {
    step: ExecutionStep;
    startTime: number;
    endTime: number;
    success: boolean;
    error?: string;
}

export interface ExecutionStatistics {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    commandUsage: Record<string, number>;
}
