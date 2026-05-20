import {BlendedAnimationParams} from "../../../controls/AnimationController";

/**
 * Animation priority levels for determining which animations can interrupt others.
 */
export enum AnimationPriority {
    /** Can be interrupted by movement animations */
    LOW = 0,
    /** Default priority for movement animations (idle, walk, run) */
    NORMAL = 1,
    /** Action animations that interrupt movement (attack, interact) */
    HIGH = 2,
    /** Cannot be interrupted (death, special sequences) */
    CRITICAL = 3,
}

/**
 * Options for triggering an animation.
 */
export interface AnimationTriggerOptions {
    /** Whether the animation should loop. Default: true */
    loop?: boolean;
    /** Animation playback speed multiplier. Default: 1.0 */
    speed?: number;
    /** Duration in seconds for fade transition. Default: 0.25 */
    fadeDuration?: number;
    /** Priority level for interrupt handling. Default: NORMAL */
    priority?: AnimationPriority;
    /** Callback invoked when a non-looping animation completes */
    onComplete?: () => void;
    /** If true, pauses movement animations while this plays. Default: false */
    interruptMovement?: boolean;
}

/**
 * Interface for controlling character animations.
 * Exposed by CharacterBehavior to allow external behaviors to trigger animations
 * and control animation blending.
 */
export interface IPlayerAnimationController {
    /**
     * Trigger an animation by name.
     * @param animationName - Name of the animation clip to play
     * @param options - Optional configuration for the animation
     * @returns true if animation was started, false if rejected (invalid name or priority conflict)
     */
    triggerAnimation(animationName: string, options?: AnimationTriggerOptions): boolean;

    /**
     * Stop the current manually triggered animation and resume movement animations.
     */
    stopAnimation(): void;

    /**
     * Play multiple animations simultaneously with blend weights.
     * @param blends - Array of animations with their weights and speeds
     */
    playBlendedAnimations(blends: BlendedAnimationParams[]): void;

    /**
     * Update the weights of currently blended animations.
     * @param weights - Map of animation names to their new weights (0.0 - 1.0)
     */
    updateBlendWeights(weights: Record<string, number>): void;

    /**
     * Get the name of the currently playing animation.
     * @returns Animation name or null if no animation is playing
     */
    getCurrentAnimationName(): string | null;

    /**
     * Check if an animation is currently playing.
     * @param animationName - Optional specific animation to check. If omitted, checks if any animation is playing.
     * @returns true if the specified animation (or any animation) is playing
     */
    isAnimationPlaying(animationName?: string): boolean;

    /**
     * Get a list of all available animation names on the character.
     * @returns Array of animation clip names
     */
    getAvailableAnimations(): string[];
}
