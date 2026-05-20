import {CharacterOptionsInterface} from "@stem/editor-oss/types/editor";

interface BasicInterface {
    label: string;
    key: keyof CharacterOptionsInterface;
}

export const CHARACTER_MAIN_PROPS: BasicInterface[] = [
    {label: "Health", key: "health"},
    {label: "Shield", key: "shield"},
    {label: "Walk Speed", key: "walkSpeed"},
    {label: "Run Speed", key: "runSpeed"},
    {label: "Look Speed", key: "lookSpeed"},
    {label: "Jump Strength", key: "jumpStrength"},
    {label: "Age", key: "age"},
    {label: "Slope Tolerance", key: "slopeTolerance"},
    {label: "Initial X Rotation", key: "initialXRotation"},
];

export const CHARACTER_MOVEMENT_ANIMATIONS: BasicInterface[] = [
    {label: "Idle", key: "idleAnimation"},
    {label: "Walk", key: "walkAnimation"},
    {label: "Walk Left", key: "leftDirectionAnimation"},
    {label: "Walk Right", key: "rightDirectionAnimation"},
    {label: "Run", key: "runAnimation"},
    {label: "Reverse", key: "reverseDirectionAnimation"},
    {label: "Jumping", key: "jumpAnimation"},
    {label: "Crouching", key: "crouchAnimation"},
    {label: "Death", key: "dieAnimation"},
    {label: "Throw", key: "throwAnimation"},
    {label: "Carry", key: "carryAnimation"},
    {label: "Push", key: "pushAnimation"},
    {label: "Pick Up", key: "pickUpAnimation"},
    {label: "Fall", key: "fallAnimation"},
    {label: "Falling", key: "fallingAnimation"},
];

export const CHARACTER_WEAPON_ANIMATIONS: BasicInterface[] = [
    {label: "Reload Stand", key: "reloadIdleAnimation"},
    {label: "Reload Walk", key: "reloadWalkAnimation"},
    {label: "Reload Run", key: "reloadRunAnimation"},
];

export const CHARACTER_MELEE_ANIMATIONS: BasicInterface[] = [
    {label: "Punch", key: "punchAnimation"},
    {label: "Kick", key: "kickAnimation"},
    {label: "Sword simple", key: "swordSimpleAnimation"},
    {label: "Sword Special", key: "swordSpecialAnimation"},
];
