import { describe, it, expect } from 'vitest';

import { TeamUtils, TeamMember } from '../TeamUtils';

/**
 *
 * @param team
 * @param x
 * @param y
 * @param z
 * @param enemyTeams
 */
function member(team: string, x = 0, y = 0, z = 0, enemyTeams?: string[]): TeamMember {
    return { team, position: { x, y, z }, enemyTeams };
}

describe('TeamUtils', () => {
    describe('isEnemy', () => {
        it('should return false for same team', () => {
            expect(TeamUtils.isEnemy(member('red'), member('red'))).toBe(false);
        });

        it('should return true when target team is in enemyTeams', () => {
            expect(TeamUtils.isEnemy(member('red', 0, 0, 0, ['blue']), member('blue'))).toBe(true);
        });

        it('should return true when attacker team is in target enemyTeams', () => {
            expect(TeamUtils.isEnemy(member('red'), member('blue', 0, 0, 0, ['red']))).toBe(true);
        });

        it('should return false for different teams without enemyTeams', () => {
            expect(TeamUtils.isEnemy(member('red'), member('blue'))).toBe(false);
        });
    });

    describe('isFriendly', () => {
        it('should return true for same team', () => {
            expect(TeamUtils.isFriendly(member('red'), member('red'))).toBe(true);
        });

        it('should return false for different teams', () => {
            expect(TeamUtils.isFriendly(member('red'), member('blue'))).toBe(false);
        });
    });

    describe('canAttack', () => {
        it('should allow attacking enemies', () => {
            const a = member('red', 0, 0, 0, ['blue']);
            const b = member('blue');
            expect(TeamUtils.canAttack(a, b)).toBe(true);
        });

        it('should block attacking friendlies', () => {
            expect(TeamUtils.canAttack(member('red'), member('red'))).toBe(false);
        });

        it('should allow friendly fire when enabled', () => {
            expect(TeamUtils.canAttack(member('red'), member('red'), true)).toBe(true);
        });
    });

    describe('findNearestEnemy', () => {
        it('should find the closest enemy', () => {
            const unit = member('red', 0, 0, 0, ['blue']);
            const far = member('blue', 10, 0, 0);
            const near = member('blue', 3, 0, 0);
            const friendly = member('red', 1, 0, 0);

            const result = TeamUtils.findNearestEnemy(unit, [far, near, friendly]);
            expect(result).toBe(near);
        });

        it('should respect maxRange', () => {
            const unit = member('red', 0, 0, 0, ['blue']);
            const enemy = member('blue', 10, 0, 0);

            expect(TeamUtils.findNearestEnemy(unit, [enemy], 5)).toBeNull();
            expect(TeamUtils.findNearestEnemy(unit, [enemy], 15)).toBe(enemy);
        });

        it('should return null when no enemies exist', () => {
            const unit = member('red', 0, 0, 0, ['blue']);
            const friendly = member('red', 1, 0, 0);

            expect(TeamUtils.findNearestEnemy(unit, [friendly])).toBeNull();
        });
    });

    describe('getEnemiesInRange', () => {
        it('should return all enemies within range', () => {
            const unit = member('red', 0, 0, 0, ['blue']);
            const inRange = member('blue', 3, 0, 0);
            const outOfRange = member('blue', 20, 0, 0);
            const friendly = member('red', 1, 0, 0);

            const result = TeamUtils.getEnemiesInRange(unit, [inRange, outOfRange, friendly], 5);
            expect(result).toEqual([inRange]);
        });

        it('should return empty array when no enemies in range', () => {
            const unit = member('red', 0, 0, 0, ['blue']);
            const result = TeamUtils.getEnemiesInRange(unit, [], 10);
            expect(result).toEqual([]);
        });
    });
});
