export type DamageType = 'normal' | 'pierce' | 'siege' | 'magic' | 'chaos';
export type ArmorType = 'unarmored' | 'light' | 'medium' | 'heavy' | 'hero' | 'fortified';

export interface CombatStats {
    health: number;
    maxHealth: number;
    attackDamageMin: number;
    attackDamageMax: number;
    damageType: DamageType;
    armor: number;
    armorType: ArmorType;
    critChance?: number;
    critMultiplier?: number;
    healthRegen?: number;
}

export interface DamageResult {
    finalDamage: number;
    baseDamage: number;
    wasCritical: boolean;
    typeMultiplier: number;
    armorReduction: number;
}

// WC3-inspired damage effectiveness table: DAMAGE_EFFECTIVENESS[damageType][armorType]
const DAMAGE_EFFECTIVENESS: Record<DamageType, Record<ArmorType, number>> = {
    normal:  { unarmored: 1.0, light: 1.0,  medium: 1.5, heavy: 1.0,  hero: 1.0, fortified: 0.7 },
    pierce:  { unarmored: 1.0, light: 2.0,  medium: 0.75,heavy: 1.0,  hero: 0.5, fortified: 0.35 },
    siege:   { unarmored: 1.0, light: 1.0,  medium: 0.5, heavy: 1.0,  hero: 0.5, fortified: 1.5 },
    magic:   { unarmored: 1.25,light: 0.75, medium: 2.0, heavy: 1.0,  hero: 0.5, fortified: 0.35 },
    chaos:   { unarmored: 1.0, light: 1.0,  medium: 1.0, heavy: 1.0,  hero: 1.0, fortified: 1.0 },
};

const ARMOR_PRIORITY: Record<ArmorType, number> = {
    hero: 100,
    heavy: 80,
    medium: 60,
    light: 40,
    unarmored: 30,
    fortified: 10,
};

/**
 *
 * @param min
 * @param max
 */
function rollDamage(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

/**
 *
 * @param armor
 */
function armorReductionFactor(armor: number): number {
    // Returns the multiplier (0-1 range for positive armor, >1 for negative)
    return 1 - (0.06 * armor) / (1 + 0.06 * Math.abs(armor));
}

export const CombatUtils = {
    calculateDamage(attacker: CombatStats, target: CombatStats): DamageResult {
        const baseDamage = rollDamage(attacker.attackDamageMin, attacker.attackDamageMax);
        const typeMultiplier = DAMAGE_EFFECTIVENESS[attacker.damageType][target.armorType];
        const armorReduction = armorReductionFactor(target.armor);

        const critChance = attacker.critChance ?? 0;
        const critMultiplier = attacker.critMultiplier ?? 2.0;
        const wasCritical = Math.random() < critChance;

        let finalDamage = baseDamage * typeMultiplier * armorReduction;
        if (wasCritical) {
            finalDamage *= critMultiplier;
        }
        finalDamage = Math.max(0, finalDamage);

        return { finalDamage, baseDamage, wasCritical, typeMultiplier, armorReduction };
    },

    applyDamage(target: CombatStats, damage: DamageResult): boolean {
        target.health = Math.max(0, target.health - damage.finalDamage);
        return target.health <= 0;
    },

    regenerateHealth(unit: CombatStats, deltaTime: number): void {
        const regen = unit.healthRegen ?? 0;
        if (regen > 0 && unit.health < unit.maxHealth) {
            unit.health = Math.min(unit.maxHealth, unit.health + regen * deltaTime);
        }
    },

    getAttackPriority(unit: { armorType: ArmorType }): number {
        return ARMOR_PRIORITY[unit.armorType] ?? 0;
    },

    selectBestTarget<T extends { armorType: ArmorType; position: { x: number; y: number; z: number } }>(
        attackerPos: { x: number; y: number; z: number },
        targets: T[],
    ): T | null {
        if (targets.length === 0) return null;

        let best: T | null = null;
        let bestScore = -Infinity;

        for (let i = 0; i < targets.length; i++) {
            const t = targets[i]!;
            const priority = ARMOR_PRIORITY[t.armorType] ?? 0;
            const dx = attackerPos.x - t.position.x;
            const dy = attackerPos.y - t.position.y;
            const dz = attackerPos.z - t.position.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            // Score: priority bonus minus distance penalty (sqrt for gentler falloff)
            const score = priority - Math.sqrt(distSq);
            if (score > bestScore) {
                bestScore = score;
                best = t;
            }
        }
        return best;
    },

    getDamageEffectiveness(damageType: DamageType, armorType: ArmorType): number {
        return DAMAGE_EFFECTIVENESS[damageType][armorType];
    },
};
