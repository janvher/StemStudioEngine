import { SparkWebGpuRenderer } from '@querielo/spark';
import { Object3D, Scene } from 'three';
import type { WebGPURenderer } from 'three/webgpu';

const SPARK_COMPOSITE_NAME = '__SparkWebGpuRenderer';

const findSparkComposite = (scene: Scene): SparkWebGpuRenderer | null => {
    const existing = scene.getObjectByName(SPARK_COMPOSITE_NAME);
    return existing instanceof SparkWebGpuRenderer ? existing : null;
};

export const ensureSparkComposite = (
    scene: Scene,
    renderer: WebGPURenderer,
    parent?: Object3D | null,
): SparkWebGpuRenderer => {
    const existing = findSparkComposite(scene);
    if (existing) {
        const targetParent = parent ?? scene;
        if (existing.parent !== targetParent) {
            targetParent.add(existing);
        }
        return existing;
    }

    const composite = new SparkWebGpuRenderer({ renderer });
    composite.name = SPARK_COMPOSITE_NAME;
    composite.userData.isRuntimeOnly = true;
    composite.userData.sparkComposite = true;
    (parent ?? scene).add(composite);

    return composite;
};

export const disposeSparkComposite = (composite: SparkWebGpuRenderer | null | undefined) => {
    if (!composite) {
        return;
    }

    composite.removeFromParent();
    composite.dispose();
};