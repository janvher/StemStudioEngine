/// <reference no-default-lib="true"/>
/// <reference lib="webworker" />

import { expose, transfer } from "comlink";
import { Noise } from "noisejs";
import seedrandom from "seedrandom";
import { MathUtils, Matrix4, Quaternion, Vector3 } from "three";

import { EndlessTerrainGridHeight } from "./EndlessTerrainGridHeight";
import { EndlessTerrainHeight } from "./EndlessTerrainHeight";

type TerrainObjectType = "plant" | "rock" | "tree";

export type TerrainPlacementTaskMessage = {
    taskId: string;
    chunkX: number;
    chunkZ: number;
    generation: number;
    start: number;
    count: number;
    totalInChunk: number;
    options: {
        chunkSize: number;
        chunkSegments: number;
        seed: number;
        maxHeight: number;
        grassMaxHeight: number;
        rockMaxHeight: number;
        treeDensity: number;
        rockDensity: number;
        useEnhancedTerrain: boolean;
        waterPercentage: number;
        verticalOffset: number;
    };
    terrainModels: Array<{
        minScale: number;
        maxScale: number;
        terrainOffset: number;
        probability: number;
        type: TerrainObjectType;
    }>;
};

export type TerrainPlacementResultMessage = {
    taskId: string;
    chunkX: number;
    chunkZ: number;
    generation: number;
    modelIndices: Int32Array;
    matrices: Float32Array;
    objectIds: string[];
};

const yAxis = new Vector3(0, 1, 0);
const tmpMatrix = new Matrix4();
const tmpPosition = new Vector3();
const tmpScale = new Vector3();
const tmpQuaternion = new Quaternion();

/**
 *
 * @param options
 */
function createGridHeightSampler(options: TerrainPlacementTaskMessage["options"]): (x: number, z: number) => number {
    const baseHeight = new EndlessTerrainHeight(
        options.seed,
        options.maxHeight,
        options.waterPercentage,
    );
    const continuousHeight = options.useEnhancedTerrain
        ? baseHeight.getEnhancedHeightFn()
        : baseHeight.getHeightFn();
    const gridSpacing = options.chunkSize / options.chunkSegments;
    const gridOffset = (options.chunkSize / 2) % gridSpacing;
    const gridHeight = new EndlessTerrainGridHeight(continuousHeight, gridSpacing, gridOffset);

    return gridHeight.getHeightFn();
}

/**
 *
 * @param terrainModels
 * @param isDitch
 * @param isGrass
 * @param isRock
 * @param isSnow
 * @param rand
 */
function chooseModelForZone(
    terrainModels: TerrainPlacementTaskMessage["terrainModels"],
    isDitch: boolean,
    isGrass: boolean,
    isRock: boolean,
    isSnow: boolean,
    rand: number,
): number {
    let totalWeight = 0;
    const compatible: Array<{ index: number; weight: number }> = [];

    for (let i = 0; i < terrainModels.length; i++) {
        const model = terrainModels[i];
        if (!model) {
            continue;
        }

        if (model.type === "plant" && !isGrass) continue;
        if (model.type === "tree" && (isDitch || isSnow)) continue;
        if (model.type === "rock" && !isRock && !isSnow) continue;

        if (model.probability <= 0) {
            continue;
        }

        compatible.push({ index: i, weight: model.probability });
        totalWeight += model.probability;
    }

    if (compatible.length === 0 || totalWeight === 0) {
        return -1;
    }

    let accumulated = 0;
    const target = rand * totalWeight;
    for (const entry of compatible) {
        accumulated += entry.weight;
        if (target <= accumulated) {
            return entry.index;
        }
    }

    return compatible[compatible.length - 1]?.index ?? -1;
}

/**
 *
 * @param task
 */
export function processPlacementTask(task: TerrainPlacementTaskMessage): TerrainPlacementResultMessage {
    const {
        taskId,
        chunkX,
        chunkZ,
        generation,
        start,
        count,
        options,
        terrainModels,
    } = task;

    const heightFn = createGridHeightSampler(options);
    const forestNoise = new Noise(options.seed + 12345);

    const modelIndices: number[] = [];
    const matrices: number[] = [];
    const objectIds: string[] = [];

    for (let i = 0; i < count; i++) {
        const objectIndex = start + i;

        const rng = seedrandom(`${options.seed}:${chunkX}:${chunkZ}:${objectIndex}`);
        const rx = (rng() ?? 0) - 0.5;
        const rz = (rng() ?? 0) - 0.5;
        const rScale = rng() ?? 0;
        const rRot = rng() ?? 0;
        const rModel = rng() ?? 0;

        const x = (chunkX + rx) * options.chunkSize;
        const z = (chunkZ + rz) * options.chunkSize;
        const y = heightFn(x, z);

        const isDitchArea = y < 0;
        const isGrassArea = y >= 0 && y <= options.grassMaxHeight;
        const isRockArea = y > options.grassMaxHeight && y <= options.rockMaxHeight;
        const isSnowArea = y > options.rockMaxHeight;

        const modelIndex = chooseModelForZone(
            terrainModels,
            isDitchArea,
            isGrassArea,
            isRockArea,
            isSnowArea,
            rModel,
        );
        if (modelIndex === -1) {
            continue;
        }

        const model = terrainModels[modelIndex];
        if (!model) {
            continue;
        }

        if (model.type === "tree") {
            const coarse = forestNoise.perlin2(x * 0.012, z * 0.012);
            const fine = forestNoise.perlin2(x * 0.06, z * 0.06);
            const forestSample = coarse + fine * 0.3;
            const treeOffset = (options.treeDensity / 100) * 1.3 - 0.5;
            const minForestDensity = options.treeDensity > 0 ? 0.08 : 0;
            const forestDensity = Math.max(minForestDensity, (forestSample + treeOffset) / (1 + treeOffset));
            const rForest = seedrandom(`${options.seed}:forest:${chunkX}:${chunkZ}:${objectIndex}`)();
            if (rForest > forestDensity) {
                continue;
            }
        }

        if (model.type === "rock") {
            const rRockDensity = seedrandom(`${options.seed}:rock:${chunkX}:${chunkZ}:${objectIndex}`)();
            if (rRockDensity > options.rockDensity / 50) {
                continue;
            }
        }

        const scale = MathUtils.lerp(model.minScale, model.maxScale, rScale);
        const terrainOffset = model.terrainOffset;
        tmpPosition.set(x, y + options.verticalOffset - terrainOffset, z);
        tmpScale.set(scale, scale, scale);
        tmpQuaternion.setFromAxisAngle(yAxis, rRot * Math.PI * 2);
        tmpMatrix.compose(tmpPosition, tmpQuaternion, tmpScale);

        modelIndices.push(modelIndex);
        matrices.push(...tmpMatrix.elements);
        objectIds.push(`${chunkX}:${chunkZ}:${modelIndex}:${objectIndex}`);
    }

    return {
        taskId,
        chunkX,
        chunkZ,
        generation,
        modelIndices: Int32Array.from(modelIndices),
        matrices: Float32Array.from(matrices),
        objectIds,
    };
}

const api = {
    processPlacementTask(task: TerrainPlacementTaskMessage): TerrainPlacementResultMessage {
        const result = processPlacementTask(task);
        return transfer(result, [result.modelIndices.buffer, result.matrices.buffer]);
    },
};

expose(api);

export type TerrainPlacementWorkerAPI = typeof api;
