/**
 * src/v3/ui/composables/useWorld.ts
 * Integration Layer: Vue <-> ECS
 */
import { getEcsRegistry } from '../../platform/loader';
import { HistoryStack } from '../../core/ecs/command';

// Singleton Instances
// We instantiate them once so the state persists across component remounts
const registry = getEcsRegistry();
const history = new HistoryStack(registry);

export function useWorld() {
    return {
        registry,
        history,
        // Direct access to state for Vue templates
        // Due to shallowReactive in Registry, this is reactive for Vue
        state: registry.getSnapshot()
    };
}
