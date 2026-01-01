import { describe, it, expect, beforeEach } from 'vitest';
import { Registry } from '../../core/ecs/registry';
import { type EntityId } from '../../core/ecs/types';

describe('Serialization System', () => {
    let registry: Registry;

    beforeEach(() => {
        registry = new Registry();
    });

    it('should save and load entities with persistent components', () => {
        // Setup
        const id = registry.createEntity('test-entity' as EntityId);

        // Persistent
        registry.addComponent(id, 'Transform', { x: 100, y: 100, z: 1, width: 80, height: 80 });
        registry.addComponent(id, 'Visual', { type: 'color', src: '#fff', visible: true });

        // Transient (Should NOT be saved)
        registry.addComponent(id, 'Interaction', {
            isDraggable: true, isSelectable: true, isSelected: true, isHovered: false
        });

        // Act: Serialize
        const json = registry.serialize();

        // Verify JSON string
        expect(json).toContain('test-entity');
        expect(json).toContain('"x":100');
        expect(json).not.toContain('Interaction');
        expect(json).not.toContain('isSelected');

        // Act: Clear and Deserialize
        registry.destroyEntity(id); // OR registry.clear() if exposed, but deserialize clears internally.

        // Ensure empty state?
        // registry.deserialize impl clears state.
        registry.deserialize(json);

        // Assert
        const loadedTransform = registry.getComponent(id, 'Transform');
        const loadedInteraction = registry.getComponent(id, 'Interaction');

        expect(loadedTransform).toBeDefined();
        if (loadedTransform) {
            expect(loadedTransform.x).toBe(100);
        }

        // Interaction should be gone
        expect(loadedInteraction).toBeUndefined();
    });

    it('should handle empty registry', () => {
        const json = registry.serialize();
        registry.deserialize(json);
        expect(Array.from(registry.getSnapshot().entities).length).toBe(0);
    });
});
