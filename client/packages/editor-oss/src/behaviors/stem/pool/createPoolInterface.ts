import type { StemPool } from './StemPool';
import { createObjectPool } from '@stem/editor-oss/utils/ObjectPool';

export const createPoolInterface = (): StemPool => ({
    create: createObjectPool,
});
