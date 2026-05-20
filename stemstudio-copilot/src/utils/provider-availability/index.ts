/**
 * Provider availability tracking.
 * Tracks LLM provider health to avoid retrying known-down providers on every request.
 *
 * State machine:
 *   available → (2 consecutive failures) → degraded (30s cooldown)
 *   degraded  → (3 more failures, 5 total) → unavailable (5min cooldown)
 *   unavailable → (cooldown expires) → degraded (allows a retry)
 *   degraded → (success) → available
 */

export type ProviderState = 'available' | 'degraded' | 'unavailable';

type ProviderRecord = {
    state: ProviderState;
    consecutiveFailures: number;
    lastFailureAt: number;
    lastSuccessAt: number;
};

const DEGRADED_THRESHOLD = 2;
const UNAVAILABLE_THRESHOLD = 5;
const DEGRADED_COOLDOWN_MS = 30_000;    // 30 seconds
const UNAVAILABLE_COOLDOWN_MS = 300_000; // 5 minutes

class ProviderAvailabilityTracker {
    private providers = new Map<string, ProviderRecord>();

    private getOrCreate(provider: string): ProviderRecord {
        let record = this.providers.get(provider);
        if (!record) {
            record = {
                state: 'available',
                consecutiveFailures: 0,
                lastFailureAt: 0,
                lastSuccessAt: 0,
            };
            this.providers.set(provider, record);
        }
        return record;
    }

    recordSuccess(provider: string): void {
        const record = this.getOrCreate(provider);
        record.state = 'available';
        record.consecutiveFailures = 0;
        record.lastSuccessAt = Date.now();
    }

    recordFailure(provider: string): void {
        const record = this.getOrCreate(provider);
        record.consecutiveFailures++;
        record.lastFailureAt = Date.now();

        if (record.consecutiveFailures >= UNAVAILABLE_THRESHOLD) {
            record.state = 'unavailable';
        } else if (record.consecutiveFailures >= DEGRADED_THRESHOLD) {
            record.state = 'degraded';
        }
    }

    /**
     * Check if a provider is available for use.
     * Respects cooldown windows — expired cooldowns transition back to degraded.
     */
    isAvailable(provider: string): boolean {
        const record = this.providers.get(provider);
        if (!record) return true; // Unknown provider assumed available

        const now = Date.now();

        if (record.state === 'available') return true;

        if (record.state === 'degraded') {
            const elapsed = now - record.lastFailureAt;
            if (elapsed >= DEGRADED_COOLDOWN_MS) {
                // Cooldown expired — allow a retry
                return true;
            }
            return false;
        }

        if (record.state === 'unavailable') {
            const elapsed = now - record.lastFailureAt;
            if (elapsed >= UNAVAILABLE_COOLDOWN_MS) {
                // Cooldown expired — transition to degraded and allow retry
                record.state = 'degraded';
                record.consecutiveFailures = DEGRADED_THRESHOLD;
                return true;
            }
            return false;
        }

        return true;
    }

    getStatus(): Record<string, { state: ProviderState; failures: number; lastFailureAt: number; lastSuccessAt: number }> {
        const result: Record<string, { state: ProviderState; failures: number; lastFailureAt: number; lastSuccessAt: number }> = {};
        for (const [name, record] of this.providers) {
            result[name] = {
                state: record.state,
                failures: record.consecutiveFailures,
                lastFailureAt: record.lastFailureAt,
                lastSuccessAt: record.lastSuccessAt,
            };
        }
        return result;
    }
}

/** Singleton instance shared across the application */
export const providerAvailability = new ProviderAvailabilityTracker();
