export interface TeamMember {
    team: string;
    enemyTeams?: string[];
    position: { x: number; y: number; z: number };
}

/**
 *
 * @param a
 * @param a.x
 * @param a.y
 * @param a.z
 * @param b
 * @param b.x
 * @param b.y
 * @param b.z
 */
function distanceSquared(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

export const TeamUtils = {
    isEnemy(a: TeamMember, b: TeamMember): boolean {
        if (a.team === b.team) return false;
        if (a.enemyTeams && a.enemyTeams.includes(b.team)) return true;
        if (b.enemyTeams && b.enemyTeams.includes(a.team)) return true;
        return false;
    },

    isFriendly(a: TeamMember, b: TeamMember): boolean {
        return a.team === b.team;
    },

    canAttack(attacker: TeamMember, target: TeamMember, friendlyFire = false): boolean {
        if (friendlyFire) return true;
        return this.isEnemy(attacker, target);
    },

    findNearestEnemy(unit: TeamMember, allUnits: TeamMember[], maxRange?: number): TeamMember | null {
        let nearest: TeamMember | null = null;
        let nearestDistSq = maxRange !== undefined ? maxRange * maxRange : Infinity;

        for (let i = 0; i < allUnits.length; i++) {
            const other = allUnits[i]!;
            if (other === unit) continue;
            if (!this.isEnemy(unit, other)) continue;

            const dSq = distanceSquared(unit.position, other.position);
            if (dSq < nearestDistSq) {
                nearestDistSq = dSq;
                nearest = other;
            }
        }
        return nearest;
    },

    getEnemiesInRange(unit: TeamMember, allUnits: TeamMember[], range: number): TeamMember[] {
        const rangeSq = range * range;
        const result: TeamMember[] = [];

        for (let i = 0; i < allUnits.length; i++) {
            const other = allUnits[i]!;
            if (other === unit) continue;
            if (!this.isEnemy(unit, other)) continue;

            if (distanceSquared(unit.position, other.position) <= rangeSq) {
                result.push(other);
            }
        }
        return result;
    },
};
