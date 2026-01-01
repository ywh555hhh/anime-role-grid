import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImagePool } from '../../../core/systems/assets/ImagePool';
import * as idb from 'idb-keyval';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock fetch for Data URI conversion
global.fetch = vi.fn(() => Promise.resolve({
    blob: () => Promise.resolve(new Blob(['mock data'], { type: 'image/png' }))
} as any));

describe('ImagePool System', () => {
    let pool: ImagePool;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset Singleton? ImagePool is a singleton, so we might need to access the instance or reset it.
        // Since constructor is private, we depend on getInstance.
        // State is persistent across tests if we don't clear it. 
        // ImagePool has internal cache.
        pool = ImagePool.getInstance();
        // Clear internal cache hack (casting to any to access private property)
        (pool as any).urlCache.clear();
    });

    it('should store a Blob and return a UUID', async () => {
        const blob = new Blob(['test'], { type: 'text/plain' });
        const uuid = await pool.storeImage(blob);

        expect(uuid).toBeDefined();
        expect(typeof uuid).toBe('string');
        expect(idb.set).toHaveBeenCalledWith(uuid, blob);
    });

    it('should retrieve a Blob as an ObjectURL', async () => {
        const uuid = 'test-uuid';
        const blob = new Blob(['test'], { type: 'image/png' });

        // Mock IDB get
        vi.mocked(idb.get).mockResolvedValue(blob);

        const url = await pool.getImage(uuid);

        expect(idb.get).toHaveBeenCalledWith(uuid);
        expect(url).toBe('blob:mock-url');
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
    });

    it('should cache ObjectURLs', async () => {
        const uuid = 'test-uuid';
        const blob = new Blob(['test'], { type: 'image/png' });
        vi.mocked(idb.get).mockResolvedValue(blob);

        await pool.getImage(uuid);
        await pool.getImage(uuid);

        expect(idb.get).toHaveBeenCalledTimes(1); // Only once due to cache
        expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    it('should store a clean URL directly', async () => {
        const url = 'https://localhost:3000/image.png';
        const uuid = await pool.storeImage(url);

        expect(idb.set).toHaveBeenCalledWith(uuid, url);
    });

    it('should proxy unsafe external URLs', async () => {
        const unsafeUrl = 'http://example.com/image.jpg';
        const uuid = await pool.storeImage(unsafeUrl);

        // Capture what was set
        const setCall = vi.mocked(idb.set).mock.calls[0];
        const storedValue = setCall[1] as string;

        expect(storedValue).toContain('wsrv.nl');
        expect(storedValue).toContain(encodeURIComponent(unsafeUrl));
    });

    it('should purge unused assets', async () => {
        // Mock keys in DB
        const allKeys = ['used-uuid', 'unused-uuid-1', 'unused-uuid-2'];
        vi.mocked(idb.keys).mockResolvedValue(allKeys);

        const activeIds = ['used-uuid'];

        const deletedCount = await pool.purgeUnused(activeIds);

        expect(idb.del).toHaveBeenCalledTimes(2);
        expect(idb.del).toHaveBeenCalledWith('unused-uuid-1');
        expect(idb.del).toHaveBeenCalledWith('unused-uuid-2');
        expect(deletedCount).toBe(2);
    });
});
