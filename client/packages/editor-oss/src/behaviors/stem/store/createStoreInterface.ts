import { StemStore } from './StemStore';
import { GlobalStore } from './GlobalStore';

export const createStoreInterface = (store: GlobalStore): StemStore => {
    return {
        get<T = unknown>(key: string): T | undefined {
            return store.get<T>(key);
        },
        set<T = unknown>(key: string, value: T): void {
            store.set(key, value);
        },
        has(key: string): boolean {
            return store.has(key);
        },
        delete(key: string): boolean {
            return store.delete(key);
        },
        keys(): string[] {
            return store.keys();
        },
        get size(): number {
            return store.size;
        },
    };
};
