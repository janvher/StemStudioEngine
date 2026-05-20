import { describe, it, expect, vi } from 'vitest';

import { CombatUtils, CombatStats, ArmorType } from '../CombatUtils';

/**
 *
 * @param overrides
 */
function makeStats(overrides?: Partial<CombatStats>): CombatStats {
    return {
        health: 100,
        maxHealth: 100,
        attackDamageMin: 10,
        attackDamageMax: 10,
        damageType: 'normal',
        armor: 0,
        armorType: 'unarmored',
        ...overrides,
    };
}

describe('CombatUtils', () => {
    describe('calculateDamage', () => {
        it('should calculate base damage with no armor', () => {
            const attacker = makeStats({ attackDamageMin: 10, attackDamageMax: 10 });
            const target = makeStats({ armor: 0, armorType: 'unarmored' });

            const result = CombatUtils.calculateDamage(attacker, target);
            expect(result.baseDamage).toBeCloseTo(10);
            expect(result.typeMultiplier).toBe(1.0);
            expect(result.finalDamage).toBeCloseTo(10);
        });

        it('should apply damage type effectiveness', () => {
            const attacker = makeStats({ damageType: 'pierce' });
            const target = makeStats({ armorType: 'light', armor: 0 });

            const result = CombatUtils.calculateDamage(attacker, target);
            expect(result.typeMultiplier).toBe(2.0);
            expect(result.finalDamage).toBeCloseTo(20);
        });

        it('should reduce damage with positive armor', () => {
            const attacker = makeStats({ attackDamageMin: 100, attackDamageMax: 100 });
            const target = makeStats({ armor: 10, armorType: 'unarmored' });

            const result = CombatUtils.calculateDamage(attacker, target);
            // armorReduction = 1 - (0.06 * 10) / (1 + 0.06 * 10) = 1 - 0.6/1.6 = 0.625
            expect(result.armorReduction).toBeCloseTo(0.625, 2);
            expect(result.finalDamage).toBeCloseTo(62.5, 0);
        });

        it('should increase damage with negative armor', () => {
            const attacker = makeStats({ attackDamageMin: 100, attackDamageMax: 100 });
            const target = makeStats({ armor: -5, armorType: 'unarmored' });

            const result = CombatUtils.calculateDamage(attacker, target);
            // armorReduction = 1 - (0.06 * -5) / (1 + 0.06 * 5) = 1 + 0.3/1.3 ≈ 1.2308
            expect(result.armorReduction).toBeGreaterThan(1);
            expect(result.finalDamage).toBeGreaterThan(100);
        });

        it('should handle critical hits', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0); // guarantees crit
            const attacker = makeStats({ critChance: 0.5, critMultiplier: 3 });
            const target = makeStats();

            const result = CombatUtils.calculateDamage(attacker, target);
            expect(result.wasCritical).toBe(true);
            expect(result.finalDamage).toBeCloseTo(30);
            vi.restoreAllMocks();
        });

        it('should not crit when critChance is 0', () => {
            const attacker = makeStats({ critChance: 0 });
            const target = makeStats();

            const result = CombatUtils.calculateDamage(attacker, target);
            expect(result.wasCritical).toBe(false);
        });

        it('chaos damage should deal full damage to all armor types', () => {
            const attacker = makeStats({ damageType: 'chaos' });
            const armorTypes: ArmorType[] = ['unarmored', 'light', 'medium', 'heavy', 'hero', 'fortified'];

            for (const armorType of armorTypes) {
                const target = makeStats({ armorType, armor: 0 });
                const result = CombatUtils.calculateDamage(attacker, target);
                expect(result.typeMultiplier).toBe(1.0);
            }
        });
    });

    describe('applyDamage', () => {
        it('should reduce health and return false when alive', () => {
            const target = makeStats({ health: 100 });
            const damage = { finalDamage: 30, baseDamage: 30, wasCritical: false, typeMultiplier: 1, armorReduction: 1 };

            const isDead = CombatUtils.applyDamage(target, damage);
            expect(isDead).toBe(false);
            expect(target.health).toBe(70);
        });

        it('should return true when health reaches 0', () => {
            const target = makeStats({ health: 20 });
            const damage = { finalDamage: 50, baseDamage: 50, wasCritical: false, typeMultiplier: 1, armorReduction: 1 };

            const isDead = CombatUtils.applyDamage(target, damage);
            expect(isDead).toBe(true);
            expect(target.health).toBe(0);
        });
    });

    describe('regenerateHealth', () => {
        it('should regenerate health over time', () => {
            const unit = makeStats({ health: 80, maxHealth: 100, healthRegen: 10 });
            CombatUtils.regenerateHealth(unit, 1);
            expect(unit.health).toBe(90);
        });

        it('should not exceed maxHealth', () => {
            const unit = makeStats({ health: 95, maxHealth: 100, healthRegen: 10 });
            CombatUtils.regenerateHealth(unit, 1);
            expect(unit.health).toBe(100);
        });

        it('should not regen when healthRegen is undefined', () => {
            const unit = makeStats({ health: 50, maxHealth: 100 });
            CombatUtils.regenerateHealth(unit, 1);
            expect(unit.health).toBe(50);
        });
    });

    describe('getAttackPriority', () => {
        it('should return correct priorities', () => {
            expect(CombatUtils.getAttackPriority({ armorType: 'hero' })).toBe(100);
            expect(CombatUtils.getAttackPriority({ armorType: 'heavy' })).toBe(80);
            expect(CombatUtils.getAttackPriority({ armorType: 'medium' })).toBe(60);
            expect(CombatUtils.getAttackPriority({ armorType: 'light' })).toBe(40);
            expect(CombatUtils.getAttackPriority({ armorType: 'unarmored' })).toBe(30);
            expect(CombatUtils.getAttackPriority({ armorType: 'fortified' })).toBe(10);
        });
    });

    describe('selectBestTarget', () => {
        it('should prefer high-priority nearby targets', () => {
            const pos = { x: 0, y: 0, z: 0 };
            const hero = { armorType: 'hero' as ArmorType, position: { x: 5, y: 0, z: 0 } };
            const light = { armorType: 'light' as ArmorType, position: { x: 1, y: 0, z: 0 } };

            const best = CombatUtils.selectBestTarget(pos, [hero, light]);
            // hero: priority 100 - distance 5 = 95
            // light: priority 40 - distance 1 = 39
            expect(best).toBe(hero);
        });

        it('should return null for empty targets', () => {
            expect(CombatUtils.selectBestTarget({ x: 0, y: 0, z: 0 }, [])).toBeNull();
        });
    });

    describe('getDamageEffectiveness', () => {
        it('should return correct multiplier from table', () => {
            expect(CombatUtils.getDamageEffectiveness('pierce', 'light')).toBe(2.0);
            expect(CombatUtils.getDamageEffectiveness('siege', 'fortified')).toBe(1.5);
            expect(CombatUtils.getDamageEffectiveness('magic', 'unarmored')).toBe(1.25);
        });
    });
});
