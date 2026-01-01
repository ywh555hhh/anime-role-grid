/**
 * src/v3/tests/systems/layout.test.ts
 * Unit Tests for LayoutSystem (Entity-Based)
 */
import { describe, it, expect, vi } from 'vitest';
import { Registry } from '../../core/ecs/registry';
import { LayoutSystem } from '../../core/systems/layout';
import type { EntityId } from '../../core/ecs/types';

describe('V3 Layout System', () => {

    it('should find occupant based on entity distance', () => {
        const registry = new Registry();

        // 1. Setup Slot Entity
        const slotId = registry.createEntity();
        registry.addComponent(slotId, 'Transform', {
            x: 100, y: 100,
            width: 80, height: 80,
            z: 0
        });
        // Slot Center: 140, 140

        // 2. Setup Candidates
        const nearId = registry.createEntity();
        registry.addComponent(nearId, 'Transform', {
            x: 105, y: 105, // Center: 145, 145 (Dist: ~7px)
            width: 80, height: 80, z: 1
        });

        const farId = registry.createEntity();
        registry.addComponent(farId, 'Transform', {
            x: 200, y: 200, // Center: 240, 240 (Dist: >100px)
            width: 80, height: 80, z: 1
        });

        const candidates = [nearId, farId];

        // 3. Test Check
        const found = LayoutSystem.findOccupant(slotId, registry, candidates, null, 20); // Threshold 20
        expect(found).toBe(nearId);

        // Test with too small threshold
        const missed = LayoutSystem.findOccupant(slotId, registry, candidates, null, 5);
        expect(missed).toBeNull();
    });

    it('should ignore excluded entity (self)', () => {
        const registry = new Registry();
        const slotId = registry.createEntity();
        registry.addComponent(slotId, 'Transform', { x: 0, y: 0, width: 50, height: 50, z: 0 });

        const selfId = registry.createEntity();
        registry.addComponent(selfId, 'Transform', { x: 0, y: 0, width: 50, height: 50, z: 1 });

        const candidates = [selfId];

        const found = LayoutSystem.findOccupant(slotId, registry, candidates, selfId, 50);
        expect(found).toBeNull(); // Should ignore self
    });

    it('should warn when using deprecated calculateSlots', () => {
        const registry = new Registry();
        const spy = vi.spyOn(console, 'warn');
        LayoutSystem.calculateSlots('dummy' as EntityId, registry);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
    });
});
