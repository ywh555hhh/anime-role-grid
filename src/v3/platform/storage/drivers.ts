import { get, set, del, clear } from 'idb-keyval';

/**
 * Abstract Storage Driver Interface
 * Allows swapping implementation (Local vs IDB vs Cloud)
 */
export interface IStorageDriver {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<void>;
    del(key: string): Promise<void>;
    clear(): Promise<void>;
}

/**
 * Driver 1: LocalStorage (Sync wrapper, Global Config)
 */
export class LocalStorageDriver implements IStorageDriver {
    async get<T>(key: string): Promise<T | undefined> {
        const item = localStorage.getItem(key);
        if (!item) return undefined;
        try {
            return JSON.parse(item) as T;
        } catch {
            return undefined;
        }
    }

    async set<T>(key: string, value: T): Promise<void> {
        localStorage.setItem(key, JSON.stringify(value));
    }

    async del(key: string): Promise<void> {
        localStorage.removeItem(key);
    }

    async clear(): Promise<void> {
        localStorage.clear();
    }
}

/**
 * Driver 2: IndexedDB (Async, Project Data)
 * Uses 'idb-keyval' as the lightweight robust wrapper.
 */
export class IndexedDBDriver implements IStorageDriver {
    async get<T>(key: string): Promise<T | undefined> {
        return await get(key);
    }

    async set<T>(key: string, value: T): Promise<void> {
        await set(key, value);
    }

    async del(key: string): Promise<void> {
        await del(key);
    }

    async clear(): Promise<void> {
        await clear();
    }
}
