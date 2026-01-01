/**
 * src/v3/ui/composables/useGrid.ts
 * Grid Management
 */
import { useWorld } from './useWorld';
import type { EntityId, ComponentData } from '../../core/ecs/types';

// Singleton Ref for the Main Grid
// In a real app, we might search the registry for LayoutConfig components
let mainGridId: EntityId | null = null;

export function useGrid() {
    const { registry } = useWorld();

    function initMainGrid() {
        if (mainGridId) return mainGridId;

        const id = registry.createEntity();

        // 1. Transform (Background Board Area)
        const transform: ComponentData<'Transform'> = {
            x: 50,
            y: 100,
            z: 0,
            width: 400,
            height: 400
        };
        registry.addComponent(id, 'Transform', transform);

        // 2. Visual (Background)
        registry.addComponent(id, 'Visual', {
            src: '#f0f0f0',
            type: 'color',
            visible: true,
            styleVariant: 'board'
        });

        // 3. LayoutConfig (3x3 Grid)
        registry.addComponent(id, 'LayoutConfig', {
            strategy: 'grid',
            rows: 3,
            cols: 3,
            gap: 10,
            padding: 10
        });

        // 4. Interaction (Not really dragging the board yet)
        registry.addComponent(id, 'Interaction', {
            isDraggable: false,
            isSelectable: false,
            isSelected: false,
            isHovered: false
        });

        mainGridId = id;
        return id;
    }

    return {
        initMainGrid,
        mainGridId: () => mainGridId
    };
}
