import { PackedSplats, SplatMesh } from '@querielo/spark';
import type { Object3D } from 'three';

import { markGaussianSplatObject } from '../../../model/gaussianSplats';
import BaseLoader from './BaseLoader';

type SparkGaussianSplatLoaderOptions = {
    CacheKey?: string;
    Type?: string;
};

class SparkGaussianSplatLoader extends BaseLoader {
    private static packedSplatsCache = new Map<string, PackedSplats>();
    private static pendingPackedSplats = new Map<string, Promise<PackedSplats>>();

    private resolveUrl(url: string) {
        const serverPrefix = (this as BaseLoader & { server?: string }).server || '';
        return url.startsWith('blob:') || url.startsWith('http') || url.startsWith('https')
            ? url
            : serverPrefix + url;
    }

    private async getPackedSplats(url: string, options?: SparkGaussianSplatLoaderOptions) {
        const cacheKey = options?.CacheKey || url;
        const cached = SparkGaussianSplatLoader.packedSplatsCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const pending = SparkGaussianSplatLoader.pendingPackedSplats.get(cacheKey);
        if (pending) {
            return pending;
        }

        const packedSplats = new PackedSplats({ url });
        const loadPromise = packedSplats.initialized.then(() => {
            SparkGaussianSplatLoader.pendingPackedSplats.delete(cacheKey);
            SparkGaussianSplatLoader.packedSplatsCache.set(cacheKey, packedSplats);
            return packedSplats;
        }).catch((error) => {
            SparkGaussianSplatLoader.pendingPackedSplats.delete(cacheKey);
            throw error;
        });

        SparkGaussianSplatLoader.pendingPackedSplats.set(cacheKey, loadPromise);
        return loadPromise;
    }

    async load(url: string, options?: SparkGaussianSplatLoaderOptions): Promise<Object3D> {
        const resolvedUrl = this.resolveUrl(url);
        const packedSplats = await this.getPackedSplats(resolvedUrl, options);
        const mesh = new SplatMesh({ packedSplats });
        await mesh.initialized;

        mesh.userData.type = 'GaussianSplat';
        mesh.userData.url = url;
        mesh.userData.options = options;
        markGaussianSplatObject(mesh, options?.Type);

        return mesh;
    }
}

export default SparkGaussianSplatLoader;