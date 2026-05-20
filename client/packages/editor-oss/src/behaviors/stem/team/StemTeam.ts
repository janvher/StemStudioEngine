import type { TeamMember } from '@stem/editor-oss/utils/TeamUtils';

export type { TeamMember };

/**
 * Team affiliation checks and spatial enemy queries.
 */
export interface StemTeam {
    /**
     * Check if two units are on opposing teams.
     *
     * @param a - First team member
     * @param b - Second team member
     * @returns True if they are enemies
     */
    isEnemy(a: TeamMember, b: TeamMember): boolean;

    /**
     * Check if two units are on the same team.
     *
     * @param a - First team member
     * @param b - Second team member
     * @returns True if they are friendly
     */
    isFriendly(a: TeamMember, b: TeamMember): boolean;

    /**
     * Check if an attacker is allowed to attack a target.
     *
     * @param attacker - The attacking unit
     * @param target - The potential target
     * @param friendlyFire - Whether to allow attacking friendly units (default false)
     * @returns True if the attack is permitted
     */
    canAttack(attacker: TeamMember, target: TeamMember, friendlyFire?: boolean): boolean;

    /**
     * Find the nearest enemy unit within an optional range.
     *
     * @param unit - The unit searching for enemies
     * @param allUnits - All units to search through
     * @param maxRange - Maximum search distance; if omitted, searches all units
     * @returns The nearest enemy, or null if none found
     */
    findNearestEnemy(unit: TeamMember, allUnits: TeamMember[], maxRange?: number): TeamMember | null;

    /**
     * Get all enemy units within a given range.
     *
     * @param unit - The unit searching for enemies
     * @param allUnits - All units to search through
     * @param range - Maximum search distance
     * @returns Array of enemy units within range
     */
    getEnemiesInRange(unit: TeamMember, allUnits: TeamMember[], range: number): TeamMember[];
}
