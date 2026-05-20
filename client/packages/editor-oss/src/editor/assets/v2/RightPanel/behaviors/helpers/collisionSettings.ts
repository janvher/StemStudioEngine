import {ICollisionSettings} from "@stem/editor-oss/types/editor";

export const initialCollisionSettings = {
    disposable: true,
    playerCollision: true,
    enemyCollision: false,
    throwableCollision: false,
    canReappear: false,
};

export const COLLISION_SETTINGS: {
    label: string;
    propName: keyof ICollisionSettings;
}[] = [
    {label: "Is Disposable", propName: "disposable"},
    {label: "Player Collision", propName: "playerCollision"},
    // {label: "Throwable Collision", propName: "throwableCollision"},
    {label: "Enemy Collision", propName: "enemyCollision"},
    {label: "Can Reappear", propName: "canReappear"},
];
