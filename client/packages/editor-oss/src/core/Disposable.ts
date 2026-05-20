/**
 * Simple interface for objects that hold resources and need explicit cleanup.
 */
export interface Disposable {
    dispose(): void;
}
