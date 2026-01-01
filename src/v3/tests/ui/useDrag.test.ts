import { describe, it, expect, beforeEach } from 'vitest';
import { useDrag } from '../../ui/composables/useDrag';
import { useWorld } from '../../ui/composables/useWorld';

describe('useDrag Composable', () => {
    const { registry } = useWorld();
    const { startDrag, onDrag, endDrag, dragContext } = useDrag();

    beforeEach(() => {
        registry.batch(() => {
            // Clear for fresh state
            // Registry doesn't have clear(), but we can create new ID
        });
    });

    it('should calculate offset correctly and maintain relative position', () => {
        // Arrange
        const id = registry.createEntity();
        registry.addComponent(id, 'Transform', { x: 100, y: 100, width: 80, height: 80, z: 1 });
        registry.addComponent(id, 'Interaction', { isDraggable: true, isSelectable: true, isSelected: false, isHovered: false });

        // Act: Start Drag at (120, 120) -> Offset should be (20, 20)
        const mockStartEvent = {
            clientX: 120,
            clientY: 120,
            pointerId: 1,
            target: { setPointerCapture: () => { } }
        } as any;

        startDrag(mockStartEvent, id);

        // Assert Offset
        expect(dragContext.activeId).toBe(id);
        // Expect we implement 'offset' in dragContext
        // Since we haven't implemented it yet, this test will fail on type check if we run it now,
        // or fail logic if we check 'dragContext.offset' (undefined).
        // BUT TDD says write test first.
        // We expect dragContext to have offset.

        // Let's assume we typed it properly in the impl.
        const ctx = dragContext as any;
        expect(ctx.offset).toBeDefined();
        expect(ctx.offset.x).toBe(20);
        expect(ctx.offset.y).toBe(20);

        // Act: Move to (200, 200)
        // Expected Entity Pos: (200 - 20, 200 - 20) = (180, 180)
        const mockMoveEvent = {
            clientX: 200,
            clientY: 200,
            pointerId: 1
        } as any;

        onDrag(mockMoveEvent);

        // Assert Entity Position
        const t = registry.getComponent(id, 'Transform');
        expect(t).toBeDefined();
        if (t) {
            expect(t.x).toBe(180);
            expect(t.y).toBe(180);
        }

        // Cleanup
        endDrag({ target: { releasePointerCapture: () => { } }, pointerId: 1 } as any);
    });
});
