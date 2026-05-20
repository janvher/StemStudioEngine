export interface InputProvider<ActionsAndMotions> {
    getAction(actionId: ActionsAndMotions): boolean;
    getMotion(motionId: ActionsAndMotions): number;
    getMouseTouchPosition(): { x: number; y: number };
    pause(): void;
    resume(): void;
}