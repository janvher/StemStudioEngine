import type {Object3D} from "three";

/** An Object3D used as a weapon/item, optionally carrying a HUD icon. */
export type WeaponObject3D = Object3D & {hudImage?: string};

export interface InGameData {
    score: number;
    maxScore: number;
    totalLives: number;
    currentLives: number;
    health: number;
    initialHealth: number;
    isWinner: boolean;
    timeRemaining: string;
    playerWeapons: WeaponObject3D[];
    pickedWeaponOrItem: WeaponObject3D | undefined;
}
