/**
 * src/v3/core/ecs/command.ts
 * Command System & History Management
 */
import type { ICommand, IHistoryStack, IRegistry, EntityId, ComponentType, ComponentData } from './types';
import { shallowReactive, reactive } from 'vue';

/**
 * Concrete implementation of the History Stack
 */
export class HistoryStack implements IHistoryStack {
    private readonly past: ICommand[] = [];
    private readonly future: ICommand[] = [];
    private readonly registry: IRegistry;
    private readonly maxHistoryLength: number;

    constructor(registry: IRegistry, maxHistoryLength = 50) {
        this.registry = registry;
        this.maxHistoryLength = maxHistoryLength;
        // Make arrays reactive if we want UI to reflect undo/redo availability updates
        // But the arrays themselves are just data. The reactivity might be needed for "canUndo" getters.
        this.past = reactive([]);
        this.future = reactive([]);
    }

    /**
     * Execute a command and push to history
     * CLEARS the future stack (Destructive Redo)
     */
    execute(command: ICommand): void {
        // 1. Execute the logic
        command.execute(this.registry);

        // 2. Manage stacks
        this.future.length = 0; // Clear future
        this.past.push(command);

        // 3. Limit size
        if (this.past.length > this.maxHistoryLength) {
            this.past.shift(); // Remove oldest
        }
    }

    /**
     * Undo the last command
     */
    undo(): void {
        const command = this.past.pop();
        if (!command) return;

        command.undo(this.registry);
        this.future.push(command);
    }

    /**
     * Redo the previously undone command
     */
    redo(): void {
        const command = this.future.pop();
        if (!command) return;

        command.execute(this.registry);
        this.past.push(command);
    }

    get canUndo(): boolean {
        return this.past.length > 0;
    }

    get canRedo(): boolean {
        return this.future.length > 0;
    }
}

/**
 * Deep Clone Utility for Snapshots
 * Using structuredClone if available, otherwise JSON
 */
/**
 * Shallow Clone Utility
 * We use shallow copy to avoid memory explosion with large assets (Base64).
 * We assume ComponentData is immutable-ish (we don't mutate nested props in place).
 */
function shallowClone<T>(data: T): T {
    if (typeof data === 'object' && data !== null) {
        return { ...data };
    }
    return data;
}

/**
 * Factory for a "Set Component" Command
 * Handles both Adding (if new) and Updating (if exists)
 * Handles Removing (if newData is null/undefined - though ComponentData typically isn't null, we simulate standard flow)
 * Context: V3 types say data is ComponentData<T>.
 */
export function createSetComponentCommand<T extends ComponentType>(
    entityId: EntityId,
    type: T,
    newData: ComponentData<T>
): ICommand {
    // State to capture for Undo
    let previousData: ComponentData<T> | undefined = undefined;

    // We captured the input data. We also need to clone newData to ensure 
    // the command holds a snapshot, not a reference that might change later.
    const dataSnapshot = shallowClone(newData);

    return {
        id: crypto.randomUUID(), // Unique ID for this command instance
        type: `SET_COMPONENT_${type as string}`,
        timestamp: Date.now(),

        execute(registry: IRegistry) {
            // 1. Capture state BEFORE change (for Undo)
            // We do this every execute because if we Undo -> Redo, the state "before redo" 
            // is the same as "before first execute", but we need to stay consistent.
            // Actually, for a perfect command, previousData should be captured on the *first* execution
            // or we trust that the system state is deterministic.
            // Let's grab it now.
            const current = registry.getComponent(entityId, type);
            if (current) {
                previousData = shallowClone(current);
            } else {
                previousData = undefined;
            }

            // 2. Apply change
            registry.addComponent(entityId, type, dataSnapshot);
        },

        undo(registry: IRegistry) {
            // Restore previous state
            if (previousData) {
                registry.addComponent(entityId, type, previousData);
            } else {
                // If it didn't exist before, remove it
                registry.removeComponent(entityId, type);
            }
        }
    };
}

/**
 * Factory for a "Batch" Command
 * Executes multiple commands in sequence, undos them in reverse sequence.
 */
export function createBatchCommand(commands: ICommand[]): ICommand {
    return {
        id: crypto.randomUUID(),
        type: 'BATCH',
        timestamp: Date.now(),

        execute(registry: IRegistry) {
            for (const cmd of commands) {
                cmd.execute(registry);
            }
        },

        undo(registry: IRegistry) {
            // Undo in reverse order
            for (let i = commands.length - 1; i >= 0; i--) {
                commands[i].undo(registry);
            }
        }
    };
}
