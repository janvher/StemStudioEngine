import type { CombatStats, DamageResult, DamageType, ArmorType } from '@stem/editor-oss/utils/CombatUtils';

export type { CombatStats, DamageResult, DamageType, ArmorType };

/**
 * Combat utilities for damage calculation, targeting, and health regeneration.
 */
export interface StemCombat {
    /**
     * Calculate damage from an attacker against a target based on their stats.
     *
     * @param attacker - The attacking unit's combat stats
     * @param target - The defending unit's combat stats
     * @returns The computed damage result (amount, type, effectiveness)
     */
    calculateDamage(attacker: CombatStats, target: CombatStats): DamageResult;

    /**
     * Apply a damage result to a target's health.
     *
     * @param target - The unit receiving damage
     * @param damage - The damage result to apply
     * @returns True if the target is killed by this damage
     */
    applyDamage(target: CombatStats, damage: DamageResult): boolean;

    /**
     * Regenerate a unit's health over time based on its regen rate.
     *
     * @param unit - The unit to regenerate
     * @param deltaTime - Time elapsed in seconds since last update
     */
    regenerateHealth(unit: CombatStats, deltaTime: number): void;

    /**
     * Get the attack priority score for a unit based on its armor type.
     * Higher values indicate higher-priority targets.
     *
     * @param unit - An object with an armorType field
     * @returns A numeric priority score
     */
    getAttackPriority(unit: { armorType: ArmorType }): number;

    /**
     * Select the best target from a list based on armor type priority and distance.
     *
     * @param attackerPos - The attacker's world position
     * @param targets - Array of potential targets with armor type and position
     * @returns The best target, or null if no targets available
     */
    selectBestTarget<T extends { armorType: ArmorType; position: { x: number; y: number; z: number } }>(
        attackerPos: { x: number; y: number; z: number }, targets: T[]): T | null;

    /**
     * Get the damage effectiveness multiplier for a damage type against an armor type.
     *
     * @param damageType - The type of damage being dealt
     * @param armorType - The type of armor on the target
     * @returns A multiplier (1.0 = normal, >1.0 = effective, <1.0 = resisted)
     */
    getDamageEffectiveness(damageType: DamageType, armorType: ArmorType): number;
}
