import * as THREE from "three";

import {AnimationPriority} from "./IPlayerAnimationController";

/**
 * Tracks the current state of a manually triggered animation.
 */
export interface AnimationPlaybackState {
    name: string;
    priority: AnimationPriority;
    isPlaying: boolean;
    loop: boolean;
}

/**
 * Internal helper class for managing animation state in BipedalControl.
 * Handles animation validation, caching, and priority-based conflict resolution.
 */
export class AnimationStateManager {
    private availableAnimations: Set<string> = new Set();
    private character: THREE.Object3D | null = null;
    private currentManualAnimation: AnimationPlaybackState | null = null;

    /**
     * Initialize the manager with a character object.
     * Caches available animation names for fast lookup.
     * @param character
     */
    initialize(character: THREE.Object3D): void {
        this.character = character;
        this.cacheAvailableAnimations();
    }

    /**
     * Cache available animation names from the character's animation clips.
     * Uses a Set for O(1) lookup performance.
     */
    private cacheAvailableAnimations(): void {
        this.availableAnimations.clear();

        if (!this.character) return;

        // Check both object.animations and object._obj.animations (for wrapped objects)
        const wrapped = this.character as {_obj?: {animations?: THREE.AnimationClip[]}};
        const animations =
            (wrapped._obj?.animations?.length ?? 0) > 0
                ? (wrapped._obj?.animations as THREE.AnimationClip[])
                : this.character.animations;

        if (animations && Array.isArray(animations)) {
            for (const clip of animations) {
                if (clip.name) {
                    this.availableAnimations.add(clip.name);
                }
            }
        }
    }

    /**
     * Validate that an animation name exists on the character.
     * @param name - Animation name to validate
     * @returns true if the animation exists
     */
    validateAnimationName(name: string): boolean {
        if (!name || name === "none") {
            return false;
        }
        return this.availableAnimations.has(name);
    }

    /**
     * Get all available animation names.
     * @returns Array of animation clip names
     */
    getAvailableAnimations(): string[] {
        return Array.from(this.availableAnimations);
    }

    /**
     * Check if a new animation with the given priority can interrupt the current manual animation.
     * @param newPriority - Priority of the new animation
     * @returns true if the new animation can interrupt
     */
    canInterrupt(newPriority: AnimationPriority): boolean {
        // No current manual animation - can always start
        if (!this.currentManualAnimation || !this.currentManualAnimation.isPlaying) {
            return true;
        }

        // CRITICAL priority cannot be interrupted
        if (this.currentManualAnimation.priority === AnimationPriority.CRITICAL) {
            return false;
        }

        // Higher or equal priority can interrupt
        return newPriority >= this.currentManualAnimation.priority;
    }

    /**
     * Check if movement animations should be blocked due to a manual animation.
     * @returns true if movement animations should be suppressed
     */
    shouldBlockMovementAnimations(): boolean {
        if (!this.currentManualAnimation || !this.currentManualAnimation.isPlaying) {
            return false;
        }
        // Block movement if manual animation has NORMAL or higher priority
        return this.currentManualAnimation.priority >= AnimationPriority.NORMAL;
    }

    /**
     * Set the current manual animation state.
     * @param name
     * @param priority
     * @param loop
     */
    setManualAnimation(name: string, priority: AnimationPriority, loop: boolean): void {
        this.currentManualAnimation = {
            name,
            priority,
            isPlaying: true,
            loop,
        };
    }

    /**
     * Clear the current manual animation state.
     */
    clearManualAnimation(): void {
        if (this.currentManualAnimation) {
            this.currentManualAnimation.isPlaying = false;
        }
        this.currentManualAnimation = null;
    }

    /**
     * Get the current manual animation state.
     */
    getCurrentManualAnimation(): AnimationPlaybackState | null {
        return this.currentManualAnimation;
    }

    /**
     * Check if a manual animation is currently active.
     */
    isManualAnimationActive(): boolean {
        return this.currentManualAnimation !== null && this.currentManualAnimation.isPlaying;
    }

    /**
     * Refresh the animation cache (call after character model changes).
     */
    refreshCache(): void {
        this.cacheAvailableAnimations();
    }

    /**
     * Clean up resources.
     */
    dispose(): void {
        this.availableAnimations.clear();
        this.currentManualAnimation = null;
        this.character = null;
    }
}
