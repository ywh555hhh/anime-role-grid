import type { IPlugin } from '../../platform/api/IPlugin';
import type { ISystem } from '../../core/ecs/types';

/**
 * Demo Plugin: Chaos Theory
 * Tests: System, Pipeline
 */
export const ChaosPlugin: IPlugin = {
    id: 'demo.chaos',
    version: '0.9.0',
    meta: { name: 'Chaos System' },

    activate(ctx) {
        // 1. Register a Logic System
        const chaosSystem: ISystem = {
            id: 'system.chaos.entropy',
            priority: 1, // Low priority
            init(registry) {
                console.log('😈 Chaos System Initialized. Try dragging things!');
            }
        };

        // 2. Add Pipeline Hook (Monkey Patching for now, until we have real Pipeline API exposed in context)
        // In a real scenario, ctx.systems.registerHook('onSnap', ...) 
        // But our SystemManager checks ALL registered systems for methods.
        // So we just add the method to the system object!

        (chaosSystem as any).onSnap = (snapCtx: any) => {
            if (Math.random() > 0.7) {
                console.warn('⚡ SNAP REJECTED BY CHAOS GODS!');
                return false; // Block it
            }
            return true;
        };

        ctx.systems.register(chaosSystem);
    },

    deactivate(ctx) {
        ctx.systems.unregister('system.chaos.entropy');
    }
};
