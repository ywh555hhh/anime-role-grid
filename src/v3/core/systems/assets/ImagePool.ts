import { get, set, del, keys } from 'idb-keyval';

/**
 * ImagePool System
 * Manages storage of large image assets (Blobs) and external references (URLs).
 * - Uses IndexedDB (via idb-keyval) for persistence.
 * - Implements "Smart Proxy" to prevent Tainted Canvas issues.
 * - Returns UUIDs to keep the ECS Registry lightweight.
 */
export class ImagePool {
    private static instance: ImagePool;

    // In-memory cache for ObjectURLs to prevent flickering/re-creation
    // Map<UUID, ObjectUrl>
    private urlCache: Map<string, string> = new Map();

    private constructor() { }

    static getInstance(): ImagePool {
        if (!ImagePool.instance) {
            ImagePool.instance = new ImagePool();
        }
        return ImagePool.instance;
    }

    /**
     * Store an image (Blob, Base64, or URL) and return a UUID.
     * Automatically applies proxy for external URLs.
     */
    async storeImage(input: Blob | string): Promise<string> {
        const uuid = crypto.randomUUID();

        // 1. Handle Blob
        if (input instanceof Blob) {
            await set(uuid, input);
            return uuid;
        }

        // 2. Handle String
        if (typeof input === 'string') {
            // 2a. Base64 Data URI
            if (input.startsWith('data:')) {
                // Convert Base64 to Blob to save space? 
                // For now, store as string or Blob? 
                // Let's store as Blob if possible to treat cleanly, but Base64 string is fine for IDB.
                // Storing as string is easier for "src" compat, but Blob is better for memory.
                // Let's Convert to Blob for uniformity if data URI.
                const blob = await fetch(input).then(res => res.blob());
                await set(uuid, blob);
                return uuid;
            }

            // 2b. External URL (Smart Proxy)
            // Check if it's already a safe blob url (unlikely here) or local
            if (input.startsWith('blob:') || input.includes('localhost') || input.includes('wsrv.nl')) {
                await set(uuid, input);
            } else {
                // Wrap in proxy
                const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(input)}&output=png`;
                await set(uuid, proxyUrl);
            }
            return uuid;
        }

        throw new Error('Unsupported image format');
    }

    /**
     * Retrieve visual URL for a UUID.
     * - If Blob in DB: Returns objectURL (cached).
     * - If String in DB: Returns string (URL).
     */
    async getImage(uuid: string): Promise<string | undefined> {
        // 1. Check Memory Cache
        if (this.urlCache.has(uuid)) {
            return this.urlCache.get(uuid);
        }

        // 2. Check IndexedDB
        const data = await get<Blob | string>(uuid);

        if (!data) return undefined;

        if (data instanceof Blob) {
            const url = URL.createObjectURL(data);
            this.urlCache.set(uuid, url);
            return url;
        }

        // String (URL)
        this.urlCache.set(uuid, data as string);
        return data as string;
    }

    /**
     * Clean up unused assets.
     * @param activeIds List of UUIDs currently in use by the Registry.
     */
    async purgeUnused(activeIds: string[]): Promise<number> {
        const allKeys = await keys();
        const activeSet = new Set(activeIds);
        let deletedCount = 0;

        for (const key of allKeys) {
            if (typeof key === 'string' && !activeSet.has(key)) {
                // Double check it looks like a UUID? 
                // For now, assume all keys in this store are image UUIDs.
                await del(key);

                // Cleanup Cache
                if (this.urlCache.has(key)) {
                    const url = this.urlCache.get(key);
                    if (url && url.startsWith('blob:')) {
                        URL.revokeObjectURL(url);
                    }
                    this.urlCache.delete(key);
                }

                deletedCount++;
            }
        }
        return deletedCount;
    }
}
