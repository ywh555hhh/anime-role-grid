import { describe, it, expect, beforeEach } from 'vitest';
import { Registry } from '../../core/ecs/registry';
import { TemplateLoader } from '../../core/systems/loader';
import type { ITemplate } from '../../core/schema/template';
import type { EntityId } from '../../core/ecs/types';

describe('TemplateLoader System', () => {
    let registry: Registry;

    beforeEach(() => {
        registry = new Registry();
    });

    it('should generate correct slots for a basic grid', () => {
        // Arrange
        const template: ITemplate = {
            meta: { name: "Test Grid", version: "1.0" },
            viewports: [
                {
                    id: "main",
                    position: { x: 100, y: 100 },
                    layout: {
                        type: "grid",
                        rows: 2,
                        cols: 2,
                        gap: 10,
                        padding: 0,
                        slotSize: { w: 50, h: 50 }
                    }
                }
            ]
        };

        // Act
        TemplateLoader.load(registry, template);

        // Assert
        // We expect 4 entities (2x2) that have LayoutConfig and Transform
        // In a real scenario, we might query them. Since registry doesn't expose easy query,
        // we can iterate or checks createEntity effects if we could spy on it, 
        // but here we check state side-effects.

        // This relies on internal knowledge that Loader creates entities with 'LayoutConfig' or similar.
        // Wait, LayoutSystem calculates slots based on a "Grid Entity".
        // SO Loader should create ONE Grid Entity per Viewport? Or create individual Slot Entities?
        // Phase 3 implementation was: "Grid Entity defines the area, LayoutSystem calculates slots dynamically".
        // IF we stick to that: Loader should create 1 Entity per Viewport.
        // BUT the user instruction said: "Spawns new entities based on Viewports... -> Spawns Slot Entities?"
        // User Step 2 Assert says: "registry中拥有 LayoutConfig 组件的实体数量应为 4 (2x2)".

        // CONTRADICTION CHECK:
        // Phase 3 approach: 1 Grid Entity -> LayoutSystem calculates 9 virtual slots.
        // User Phase 6 instruction: "Generate 4 Slot Entities".
        // This implies a change in architecture: Slots become actual Entities?
        // OR the instruction implies we are counting "Slots generated conceptually".

        // Let's re-read carefully: "Step 3: Spawn: 根据 layout 参数，循环调用 createEntity 生成对应的 Slot 实体。"
        // This clearly says "Create Entity for EACH Slot".
        // This is a pivot from Phase 3 where slots were virtual.
        // "Active Slots" as entities makes "Occupancy" easier (Entity vs Entity).
        // Let's follow Phase 6 instructions: Create ACTUAL entities for slots.
        // These slots should probably have:
        // - Transform (Fixed Position)
        // - LayoutConfig (Maybe type: 'slot'?)
        // - Interaction (isDropZone: true?)

        // Let's assume we filter by "LayoutConfig" or "SlotTag" (Visual?).
        // Let's check all entities.

        // Use a simple gathering loop since we don't have queries

        // Let's cast registry to any to inspect internals for this test.
        const internalRegistry = registry as any;
        // Registry stores state in `state` (private).
        const state = internalRegistry.state;

        // Registry structure: state.components is an object map of ComponentType -> Map<EntityId, Data>
        const transformMap = state.components['Transform'] as Map<EntityId, any>;

        // If undefined, it means no entity has Transform yet
        expect(transformMap).toBeDefined();

        const allIds = Array.from(transformMap.keys());
        const slotEntities = allIds.filter(id => registry.getComponent(id, 'LayoutConfig'));

        expect(allIds.length).toBeGreaterThanOrEqual(4); // At least 4 slots
        expect(slotEntities.length).toBe(4);

        // Verification of Math for Slot 0 and Slot 1
        const s0 = slotEntities[0]!;
        const t0 = registry.getComponent(s0, 'Transform');
        expect(t0).toBeDefined();
        if (t0) {
            expect(t0.x).toBe(100);
            expect(t0.y).toBe(100);
            expect(t0.width).toBe(50);
            expect(t0.height).toBe(50);
        }

        const s1 = slotEntities[1]!;
        const t1 = registry.getComponent(s1, 'Transform');
        expect(t1).toBeDefined();
        if (t1) {
            expect(t1.x).toBe(160);
            expect(t1.y).toBe(100); // Row 0
        }
    });

    it('should handle multiple viewports', () => {
        // Arrange
        const template: ITemplate = {
            meta: { name: "Multi-View", version: "1.0" },
            viewports: [
                {
                    id: "left",
                    position: { x: 0, y: 0 },
                    layout: { type: "grid", rows: 1, cols: 2, gap: 0, padding: 0, slotSize: { w: 10, h: 10 } }
                },
                {
                    id: "right",
                    position: { x: 100, y: 0 },
                    layout: { type: "grid", rows: 1, cols: 2, gap: 0, padding: 0, slotSize: { w: 10, h: 10 } }
                }
            ]
        };

        // Act
        TemplateLoader.load(registry, template);

        // Assert
        const internalRegistry = registry as any;
        const state = internalRegistry.state;
        const transformMap = state.components['Transform'] as Map<EntityId, any>;
        const allIds = Array.from(transformMap.keys());

        expect(allIds.length).toBeGreaterThanOrEqual(4);

        // Left Viewport Slots: (0,0), (10,0)
        const leftSlots = allIds.filter(id => {
            const t = registry.getComponent(id, 'Transform');
            return t && t.x < 50;
        });
        expect(leftSlots.length).toBe(2);

        // Right Viewport Slots: (100,0), (110,0)
        const rightSlots = allIds.filter(id => {
            const t = registry.getComponent(id, 'Transform');
            return t && t.x >= 100;
        });
        expect(rightSlots.length).toBe(2);
    });
});
