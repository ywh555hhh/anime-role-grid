/**
 * src/v3/tests/core/registry.test.ts
 * Unit Tests for Core Registry
 */
import { describe, it, expect, vi } from 'vitest';
import { Registry } from '../../core/ecs/registry';
import { effect } from 'vue';

describe('V3 Core Registry', () => {

    it('should create and destroy entities', () => {
        const registry = new Registry();
        const id = registry.createEntity();

        expect(id).toBeDefined();
        // Accessing private state via snapshot or getting non-existent components
        expect(registry.getComponent(id, 'Transform')).toBeUndefined();

        registry.destroyEntity(id);
        // In a real set check we could spy, but here we assume no crash
    });

    it('should manage components with strict types', () => {
        const registry = new Registry();
        const id = registry.createEntity();

        const transformData = { x: 10, y: 20, z: 1 };
        registry.addComponent(id, 'Transform', transformData);

        const retrieved = registry.getComponent(id, 'Transform');
        expect(retrieved).toEqual(transformData);

        // Remove
        registry.removeComponent(id, 'Transform');
        expect(registry.getComponent(id, 'Transform')).toBeUndefined();
    });

    it('should maintain inverted indices', () => {
        const registry = new Registry();
        const id1 = registry.createEntity();
        const id2 = registry.createEntity();

        registry.addComponent(id1, 'Visual', { src: 'a', type: 'image', visible: true });
        registry.addComponent(id2, 'Visual', { src: 'b', type: 'image', visible: true });

        // Query logic test (Bonus verify of internal index consistency via public query)
        const visualIds = registry.query(['Visual']);
        expect(visualIds.has(id1)).toBe(true);
        expect(visualIds.has(id2)).toBe(true);
        expect(visualIds.size).toBe(2);

        registry.removeComponent(id1, 'Visual');
        const visualIdsAfter = registry.query(['Visual']);
        expect(visualIdsAfter.has(id1)).toBe(false);
        expect(visualIdsAfter.has(id2)).toBe(true);
    });

    // REQ-TECH-04: Reactivity Test
    it('should be reactive to component changes', async () => {
        const registry = new Registry();
        const id = registry.createEntity();

        let count = 0;

        // Setup a Vue effect to watch for Transform component presence
        effect(() => {
            // This access should collect dependencies
            const comp = registry.getComponent(id, 'Transform');
            if (comp) count++;
        });

        // Initial: count should remain 0 (or 1 if effect runs immediately with undefined)
        // effect runs immediately. comp is undefined. count is 0.
        expect(count).toBe(0);

        // Action: Add Component
        registry.addComponent(id, 'Transform', { x: 0, y: 0, z: 0 });

        // Assert: Triggered
        // Vue effects are usually synchronous for sync updates unless scheduled.
        // We anticipate count to increment.
        expect(count).toBe(1); // Effect re-runs, comp found -> count++

        // Action: Remove
        registry.removeComponent(id, 'Transform');
        // Effect re-runs, comp undefined -> count unchanged? 
        // Computed/Effect:
        // Run 1: get -> undefined.
        // Run 2: (add) -> get -> defined -> count = 1.
        // Run 3: (remove) -> get -> undefined -> count stays 1.

        expect(count).toBe(1);
    });

    it('should batch updates (stub verification)', () => {
        const registry = new Registry();
        let executed = false;
        registry.batch(() => {
            executed = true;
        });
        expect(executed).toBe(true);
    });

    it('should cache queries for performance', () => {
        const registry = new Registry();
        const id1 = registry.createEntity();
        const id2 = registry.createEntity();

        registry.addComponent(id1, 'Visual', { src: 'a', type: 'image', visible: true });
        registry.addComponent(id2, 'Transform', { x: 0, y: 0, z: 0 });

        // First Query: Miss
        const result1 = registry.query(['Visual']);
        expect(result1.size).toBe(1);
        expect(result1.has(id1)).toBe(true);

        // Second Query: Hit (Internal Check?)
        // Since we can't check private `queryCache` easily without casting,
        // we check behavior correctness and maybe infer performance if we could spy.
        // For unit test, we ensure it still returns correct data after cache is presumably built.
        const result2 = registry.query(['Visual']);
        expect(result2.size).toBe(1);
        expect(result2).toEqual(result1); // Should be same content. Identity? Cached result is specific Set instance?
        // Implementation: query() returns `this.queryCache.get(key)!` directly if hit.
        // So they should be referentially equal if implementation is correct.
        // However, implementation logic for single-type query might return new Set(index) vs cached.
        // With current impl: Single Type query IS Cached.
        expect(result2).toBe(result1); // Reference check!

        // Invalidate: Add component
        registry.addComponent(id2, 'Visual', { src: 'b', type: 'image', visible: true });
        // Cache should be cleared/invalidated for ['Visual']
        const result3 = registry.query(['Visual']);
        expect(result3.size).toBe(2);
        expect(result3).not.toBe(result1); // Should be new set

        // Complex Query Cache
        registry.addComponent(id1, 'Transform', { x: 0, y: 0, z: 0 });
        const result4 = registry.query(['Visual', 'Transform']); // id1 has both, id2 has both
        expect(result4.size).toBe(2);

        // Remove component
        registry.removeComponent(id1, 'Transform');
        const result5 = registry.query(['Visual', 'Transform']);
        expect(result5.size).toBe(1); // Only id2
    });
});
