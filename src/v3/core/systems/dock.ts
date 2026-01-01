/**
 * src/v3/core/systems/dock.ts
 * Dock Layout System
 */
import type { IRegistry, EntityId, ICommand } from '../ecs/types';
import { createSetComponentCommand, createBatchCommand } from '../ecs/command';

// Constants for Dock Layout
const DOCK_Y = 600; // Fixed Y position for dock
const DOCK_START_X = 50;
const DOCK_GAP = 10;
const DOCK_ITEM_SIZE = 80;

export class DockSystem {
    /**
     * Layout all entities that belong to the Dock
     * (parentId === dockId or just concept of 'location: dock')
     * 
     * Since we don't have a live query system, we accept the list of docking candidates.
     */
    static layoutDock(
        registry: IRegistry,
        dockEntityIds: EntityId[]
    ): ICommand[] {
        const commands: ICommand[] = [];

        dockEntityIds.forEach((id, index) => {
            const transform = registry.getComponent(id, 'Transform');
            if (!transform) return;

            const targetX = DOCK_START_X + index * (DOCK_ITEM_SIZE + DOCK_GAP);
            const targetY = DOCK_Y;

            // Only update if changed (Optimization)
            if (transform.x !== targetX || transform.y !== targetY) {
                // We use Commands to update so it's reactive and undoable?
                // Actually, initial layout setup usually shouldn't be in Undo History unless it's a user action.
                // But for simplicity, let's just return commands or we can directly mutate if it's "System Maintenance".
                // In Phase 5, let's treat it as system maintenance (direct update or special system command).

                // Let's return commands, caller decides to execute.
                const cmd = createSetComponentCommand(id, 'Transform', {
                    ...transform,
                    x: targetX,
                    y: targetY
                });
                commands.push(cmd);
            }
        });

        return commands;
    }
}
