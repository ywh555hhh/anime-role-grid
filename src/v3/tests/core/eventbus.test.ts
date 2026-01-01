import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../core/systems/events';
import type { EntityId } from '../../core/ecs/types';

describe('EventBus System', () => {
    it('should emit and listen to events', () => {
        const handler = vi.fn();
        EventBus.on('entity:snapped', handler);

        const payload = { entityId: 'e1' as EntityId, slotId: 's1' as EntityId };
        EventBus.emit('entity:snapped', payload);

        expect(handler).toHaveBeenCalledWith(payload);
        expect(handler).toHaveBeenCalledTimes(1);

        // Cleanup
        EventBus.off('entity:snapped', handler);
        EventBus.emit('entity:snapped', payload);
        expect(handler).toHaveBeenCalledTimes(1); // Should not increase
    });

    it('should handle multiple handlers', () => {
        const h1 = vi.fn();
        const h2 = vi.fn();

        EventBus.on('entity:swapped', h1);
        EventBus.on('entity:swapped', h2);

        EventBus.emit('entity:swapped', { activeId: 'a', targetId: 'b' } as any);

        expect(h1).toHaveBeenCalled();
        expect(h2).toHaveBeenCalled();
    });
});
