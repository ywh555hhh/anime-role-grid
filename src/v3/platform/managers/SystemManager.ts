/**
 * src/v3/platform/managers/SystemManager.ts
 * The "Overseer" of all logic systems.
 * Responsibilities:
 * 1. Register/Unregister Systems (with Priority)
 * 2. Manage Lifecycle (init, destroy)
 * 3. Execute Pipeline Hooks (The "Middleware" of the engine)
 */
import { reactive } from 'vue';
import type { ISystem, IRegistry } from '../../core/ecs/types';

/**
 * Hook Context Definitions
 */
export interface SnapContext {
    entityId: string;
    slotId: string;
    registry: IRegistry;
}

export interface SelectionContext {
    entityIds: string[];
    registry: IRegistry;
}

/**
 * The standard hooks that systems can implement.
 * This is "duck typing" - if a system has the method, we call it.
 */
export interface SystemHooks {
    /**
     * Called when an entity attempts to snap to a slot.
     * Return `false` to CANCEL the snap (Blocker pattern).
     */
    onSnap?(ctx: SnapContext): boolean | void;

    /**
     * Called when selection changes.
     */
    onSelectionChange?(ctx: SelectionContext): void;
}

export class SystemManager {
    // Reactive list of active systems (for debugging/UI)
    public readonly systems = reactive<ISystem[]>([]);

    private registry: IRegistry;

    constructor(registry: IRegistry) {
        this.registry = registry;
    }

    /**
     * Register a new system
     * Automatically sorts by priority (High -> Low)
     */
    register(system: ISystem) {
        if (this.systems.find(s => s.id === system.id)) {
            console.warn(`[SystemManager] System ${system.id} already registered.`);
            return;
        }

        this.systems.push(system);
        this.sortSystems();

        // Lifecycle: Init
        system.init?.(this.registry);

        console.log(`[SystemManager] Registered ${system.id} (P:${system.priority})`);
    }

    /**
     * Unregister a system
     */
    unregister(systemId: string) {
        const index = this.systems.findIndex(s => s.id === systemId);
        if (index > -1) {
            const system = this.systems[index];
            system.destroy?.(); // Lifecycle: Destroy
            this.systems.splice(index, 1);
            console.log(`[SystemManager] Unregistered ${systemId}`);
        }
    }

    /**
     * Re-sort systems based on priority
     */
    private sortSystems() {
        this.systems.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Pipeline Execution: onSnap
     * Iterates through all systems. If any system returns false, the action is blocked.
     */
    executeSnapPipeline(ctx: Omit<SnapContext, 'registry'>): boolean {
        const fullCtx = { ...ctx, registry: this.registry };

        for (const system of this.systems) {
            // Check if system has the hook
            const hook = (system as any).onSnap;
            if (typeof hook === 'function') {
                const result = hook.call(system, fullCtx);
                if (result === false) {
                    console.log(`[Pipeline] Snap blocked by ${system.id}`);
                    return false; // BLOCKED
                }
            }
        }
        return true; // Approved
    }

    // --- Game Loop ---
    private isRunning = false;
    private lastTime = 0;
    private animFrameId: number | null = null;

    startLoop() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        console.log('[SystemManager] Starting Game Loop...');
        this.loop(this.lastTime);
    }

    stopLoop() {
        this.isRunning = false;
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId);
        }
    }

    private loop = (time: number) => {
        if (!this.isRunning) return;

        const delta = time - this.lastTime;
        this.lastTime = time;

        // Execute all systems
        for (const system of this.systems) {
            const sys = system as any;
            if (typeof sys.execute === 'function') {
                try {
                    sys.execute(delta, time, this.registry);
                } catch (e) {
                    console.error(`[SystemManager] Error in ${system.id}:`, e);
                }
            }
        }

        this.animFrameId = requestAnimationFrame(this.loop);
    }
}
