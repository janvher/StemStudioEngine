/**
 * Main-thread companion to QualityAssessmentWorker.
 * Sends alarm messages (edge transitions only), receives recommendations,
 * and applies preset changes via QualityManager.
 */

import type { DeviceLane } from './QualityLanes';
import { getAdjacentPreset, getLane, isLaneCeiling, isLaneFloor } from './QualityLanes';
import type { QualityManager } from './QualityManager';
import type { WorkerInboundMessage, WorkerOutboundMessage } from './worker/QualityAssessmentWorker';

export class QualityAssessmentController {
    private worker: Worker | null = null;
    private lane: DeviceLane;
    private currentPresetId: string;
    private previousAlarmStates = new Map<string, boolean>();
    private disposed = false;

    constructor(
        private qualityManager: QualityManager,
        lane: DeviceLane,
        startPresetId?: string,
    ) {
        this.lane = lane;
        const laneDef = getLane(lane);
        this.currentPresetId = startPresetId ?? laneDef.rungs[laneDef.defaultRungIndex] ?? laneDef.rungs[0]!;

        this.initWorker();
    }

    private initWorker(): void {
        try {
            this.worker = new Worker(
                new URL('./worker/QualityAssessmentWorker.ts', import.meta.url),
                { type: 'module' },
            );

            this.worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
                this.handleWorkerMessage(event.data);
            };

            this.worker.onerror = (error) => {
                console.error('[QualityAssessmentController] Worker error:', error);
            };

            this.postToWorker({
                type: 'init',
                windowSizeMs: 12000,
                downgradeThreshold: 3,
                upgradeCheckpoints: 3,
                cooldownMs: 25000,
            });
        } catch (error) {
            console.warn('[QualityAssessmentController] Failed to create worker, adaptive quality disabled:', error);
            this.worker = null;
        }
    }

    /**
     * Send an alarm to the worker. Only sends on edge transitions
     * (state change from previous call for the same alarmType).
     * @param alarmType
     * @param negative
     */
    sendAlarm(alarmType: string, negative: boolean): void {
        if (!this.worker || this.disposed) return;

        const prev = this.previousAlarmStates.get(alarmType);
        if (prev === negative) return; // no edge transition

        this.previousAlarmStates.set(alarmType, negative);
        this.postToWorker({
            type: 'alarm',
            alarmType,
            negative,
            timestamp: performance.now(),
        });
    }

    /**
     * Notify the worker of suppression events (tab hidden, resize, streaming).
     * @param event
     */
    notifyEvent(event: 'session_reset'): void {
        if (!this.worker || this.disposed) return;
        this.postToWorker({ type: event });
        this.previousAlarmStates.clear();
    }

    getCurrentPresetId(): string {
        return this.currentPresetId;
    }

    getLane(): DeviceLane {
        return this.lane;
    }

    dispose(): void {
        this.disposed = true;
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.previousAlarmStates.clear();
    }

    private handleWorkerMessage(msg: WorkerOutboundMessage): void {
        if (msg.type !== 'recommend_change') return;

        const { direction } = msg;

        // Check lane boundaries
        if (direction === 'down' && isLaneFloor(this.lane, this.currentPresetId)) return;
        if (direction === 'up' && isLaneCeiling(this.lane, this.currentPresetId)) return;

        const nextPresetId = getAdjacentPreset(this.lane, this.currentPresetId, direction);
        if (!nextPresetId) return;

        console.log(`[QualityAssessment] Stepping ${direction}: ${this.currentPresetId} → ${nextPresetId}`);
        this.currentPresetId = nextPresetId;

        // Apply via QualityManager
        this.qualityManager.applyPreset(nextPresetId, { persist: false }).then(() => {
            this.postToWorker({
                type: 'quality_applied',
                presetId: nextPresetId,
                timestamp: performance.now(),
            });
        }).catch((error) => {
            console.error('[QualityAssessmentController] Failed to apply preset:', error);
        });
    }

    private postToWorker(msg: WorkerInboundMessage): void {
        this.worker?.postMessage(msg);
    }
}
