export interface InGameData {
    score: number;
    maxScore: number;
    totalLives: number;
    currentLives: number;
    health: number;
    initialHealth: number;
    isWinner: boolean;
    timeRemaining: string;
    playerWeapons: any[];
    pickedWeaponOrItem: any;
}
