/**
 * src/v3/ui/composables/useDrag.ts
 * Drag Controller using Pointer Events
 */
import { reactive } from 'vue';
import type { EntityId, ICommand } from '../../core/ecs/types';
import { useWorld } from './useWorld';
import { createSetComponentCommand, createBatchCommand } from '../../core/ecs/command';
import { useGrid } from './useGrid';
import { LayoutSystem } from '../../core/systems/layout';
import { EventBus } from '../../core/systems/events';
import { LAYERS } from '../../core/ecs/types';

interface DragContext {
    activeId: EntityId | null;
    startX: number;
    startY: number;
    initialTransform: { x: number; y: number };
    offset: { x: number; y: number };
}

// Global drag state (assuming single pointer for now)
const dragContext: DragContext = reactive({
    activeId: null,
    startX: 0,
    startY: 0,
    initialTransform: { x: 0, y: 0 },
    offset: { x: 0, y: 0 }
});

export function useDrag() {
    const { registry, history, state } = useWorld();
    const { mainGridId } = useGrid();

    function startDrag(e: PointerEvent, entityId: EntityId) {
        const transform = registry.getComponent(entityId, 'Transform');
        const interaction = registry.getComponent(entityId, 'Interaction');

        // 0. Check Draggability
        if (interaction && !interaction.isDraggable) return;

        if (!transform) return;

        // 1. Capture Pointer to handle fast moves/outside window
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        // 2. Setup Context
        dragContext.activeId = entityId;
        dragContext.startX = e.clientX;
        dragContext.startY = e.clientY;
        dragContext.initialTransform = { x: transform.x, y: transform.y };

        // Calculate Offset (Click Point relative to Top-Left)
        dragContext.offset = {
            x: e.clientX - transform.x,
            y: e.clientY - transform.y
        };

        // 3. Mark Dragging (for UI feedback)
        // We ensure Interaction component exists, or we add one/update it
        // Simulating "Partial Update" by getting existing or default
        const currentInteraction = interaction || {
            isDraggable: true,
            isSelectable: true,
            isSelected: false,
            isHovered: false
        };

        // Direct update for visual state
        registry.addComponent(entityId, 'Interaction', {
            ...currentInteraction,
            isDraggable: true // ensure true
            // we could add a temporary 'isDragging' field if we extended the type,
            // but for now we might rely on 'activeId' in component to styling,
            // or we strictly follow schema. 
            // The schema in types.ts didn't explicitly have 'isDragging' in 'Interaction',
            // it had isDraggable, isSelectable... 
            // Let's assume we can infer 'isDragging' by checking `dragContext.activeId === id`.
        });
    }

    function onDrag(e: PointerEvent) {
        if (!dragContext.activeId) return;

        // Use Offset instead of Delta
        const newX = e.clientX - dragContext.offset.x;
        const newY = e.clientY - dragContext.offset.y;

        // 4. Transient Update (Direct Mutation)
        // Performance: Skip Command System during drag!
        // We accept that we are "dirtying" the state temporarily.
        const currentTransform = registry.getComponent(dragContext.activeId, 'Transform');
        if (currentTransform) {
            registry.addComponent(dragContext.activeId, 'Transform', {
                ...currentTransform,
                x: newX,
                y: newY
            });
        }
    }

    function endDrag(e: PointerEvent) {
        if (!dragContext.activeId) return;

        const id = dragContext.activeId;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        const currentTransform = registry.getComponent(id, 'Transform');

        // Default Target (Revert to start if no valid drop)
        let targetX = dragContext.initialTransform.x;
        let targetY = dragContext.initialTransform.y;

        // Swap Logic Data
        let swapTargetId: EntityId | null = null;
        let swapTargetNewPos = { x: 0, y: 0 }; // Where the occupant goes (A's old home)

        if (currentTransform) {
            // A. Default: Just stay where dropped (Free Roam)
            targetX = currentTransform.x;
            targetY = currentTransform.y;

            // B. Snap & Swap Logic (Phase 6: Entity-Based Slots)
            // 1. Find all available slots
            const allEntities = Array.from(state.entities);
            const slotEntities = allEntities.filter(eid => {
                const config = registry.getComponent(eid, 'LayoutConfig');
                return config && config.strategy === 'slot';
            });

            if (slotEntities.length > 0) {
                let minDist = Infinity;
                let nearestSlotId: EntityId | null = null;
                let nearestSlotTransform: any = null;

                const cardW = currentTransform.width || 80;
                const cardH = currentTransform.height || 80;
                const cx = currentTransform.x + cardW / 2;
                const cy = currentTransform.y + cardH / 2;

                // 2. Find Nearest Slot
                for (const sid of slotEntities) {
                    const st = registry.getComponent(sid, 'Transform');
                    if (!st) continue;

                    const scx = st.x + st.width / 2;
                    const scy = st.y + st.height / 2;
                    const dist = Math.hypot(cx - scx, cy - scy);

                    if (dist < minDist) {
                        minDist = dist;
                        nearestSlotId = sid as EntityId;
                        nearestSlotTransform = st;
                    }
                }

                // Threshold: Snap if center is within 50% of slot width
                // Assuming slots are roughly same size as cards or we check slot width
                if (nearestSlotId && nearestSlotTransform && minDist < (nearestSlotTransform.width / 2)) {
                    // 3. Candidate Position (Center the card in the slot)
                    // Note: Card x = Slot Center X - Card Width/2
                    const slotX = nearestSlotTransform.x + (nearestSlotTransform.width - cardW) / 2;
                    const slotY = nearestSlotTransform.y + (nearestSlotTransform.height - cardH) / 2;

                    // 4. Check Occupancy
                    // Use Centralized LayoutSystem Logic
                    const candidateIds = allEntities.filter(eid => {
                        if (eid === id) return false; // Self
                        if (eid === nearestSlotId) return false; // The Slot itself
                        // Also exclude other slots?
                        const otherConfig = registry.getComponent(eid, 'LayoutConfig');
                        if (otherConfig && otherConfig.strategy === 'slot') return false;

                        // Must be draggable/card?
                        // Just check if it has Transform and overlaps
                        return registry.getComponent(eid, 'Transform');
                    }) as EntityId[];

                    // Use standard threshold (20px helps snap feel snappy but avoids false positives)
                    const occupantId = LayoutSystem.findOccupant(
                        nearestSlotId as EntityId,
                        registry,
                        candidateIds,
                        id,
                        20
                    );

                    if (occupantId) {
                        // SWAP!
                        console.log(`Swap with ${occupantId} (Entity)`);

                        // Active (A) -> Slot Position
                        targetX = slotX;
                        targetY = slotY;

                        // Occupant (B) -> A's Old Home
                        swapTargetId = occupantId;
                        swapTargetNewPos = {
                            x: dragContext.initialTransform.x,
                            y: dragContext.initialTransform.y
                        };
                    } else {
                        // EMPTY -> JUST SNAP
                        console.log(`Snapped to Slot Entity`);
                        targetX = slotX;
                        targetY = slotY;
                    }
                }
            }
        }

        // 6. Commit Transaction

        // Silent Restore Active Entity to Initial (Clean State for Undo)
        if (currentTransform) {
            registry.addComponent(id, 'Transform', {
                ...currentTransform,
                x: dragContext.initialTransform.x,
                y: dragContext.initialTransform.y
            });
        }

        // Construct Commands
        const commands: ICommand[] = [];

        // Command 1: Move Active Entity -> Target
        if (currentTransform) {
            if (targetX !== dragContext.initialTransform.x || targetY !== dragContext.initialTransform.y) {
                const cmdA = createSetComponentCommand(id, 'Transform', {
                    ...currentTransform,
                    x: targetX,
                    y: targetY
                });
                commands.push(cmdA);
            }
        }

        // Command 2: Move Occupant -> Old Home (If Swap)
        if (swapTargetId && swapTargetNewPos) {
            const occupantTransform = registry.getComponent(swapTargetId, 'Transform');
            if (occupantTransform) {
                const cmdB = createSetComponentCommand(swapTargetId, 'Transform', {
                    ...occupantTransform,
                    x: swapTargetNewPos.x,
                    y: swapTargetNewPos.y
                });
                commands.push(cmdB);
            }
        }

        // Execute Batch or Single
        if (commands.length > 0) {
            if (commands.length === 1) {
                history.execute(commands[0]);
            } else {
                // Import createBatchCommand needed!
                const batchCmd = createBatchCommand(commands);
                history.execute(batchCmd);
            }
        } else {
            // No movement (Snapped back to start or drop in same place implies no change from initial if we silently restored)
            // Wait, if we silently restored to initial, and commands is empty, it means target == initial.
            // So we are done. Visual matches data.
        }

        dragContext.activeId = null;
    }

    return {
        dragContext, // Expose for UI styling
        startDrag,
        onDrag,
        endDrag
    };
}
