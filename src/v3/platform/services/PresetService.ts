import { reactive, ref } from 'vue';
import type { IPreset } from '../../core/types/preset';
import type { IPlugin } from '../../platform/api/IPlugin';
import { getEcsRegistry } from '../../platform/loader';

class PresetService {
    // Reactive storage for UI
    private presets = reactive<IPreset[]>([]);
    public currentPreset = ref<IPreset | null>(null);

    /**
     * Register a single preset or a list
     */
    register(items: IPreset | IPreset[]) {
        const list = Array.isArray(items) ? items : [items];
        for (const p of list) {
            // Deduplicate by ID
            if (!this.presets.find(existing => existing.id === p.id)) {
                this.presets.push(p);
            }
        }
    }

    /**
     * Called by SystemManager/Loader when a plugin is activated
     */
    registerFromPlugin(plugin: IPlugin) {
        if (plugin.presets) {
            console.log(`[PresetService] Registering ${plugin.presets.length} presets from ${plugin.id}`);
            this.register(plugin.presets);
        }
    }

    getAll() {
        return this.presets;
    }

    getByView(viewId: string) {
        return this.presets.filter(p => p.targetViewId === viewId);
    }

    /**
     * The Core "Load" Logic
     * 1. Switch View
     * 2. Clear ECS
     * 3. Hydrate
     */
    async applyPreset(preset: IPreset, workbench: any) {
        console.log(`[PresetService] Applying preset: ${preset.name} (${preset.id})`);

        this.currentPreset.value = preset;

        // 1. Switch View (This might be async if dynamic import?)
        // For now synchronous
        workbench.switchView(preset.targetViewId);

        // 2. Clear Registry
        const registry = getEcsRegistry();
        // Clear all entities manually since clear() is not exposed
        const snapshot = registry.getSnapshot();
        // Create a copy of the set to iterate safely while deleting
        const allEntities = Array.from(snapshot.entities);
        for (const eid of allEntities) {
            registry.destroyEntity(eid);
        }

        // 3. Hydrate
        // Strategy: We delegate the "Creation Logic" to the View Plugin's System?
        // Or if it's raw entities, we just add them.

        if (preset.data.entities) {
            // Snapshot restore
            console.warn('[PresetService] Snapshot hydration not fully implemented yet.');
        }

        if (preset.data.config) {
            // New Architecture:
            // Send a "Command" Entity to ECS. The GridSystem consumes it.
            const cmdId = registry.createEntity();
            registry.addComponent(cmdId, 'Command', {
                type: 'GENERATE_GRID',
                payload: preset.data.config
            });
        }
    }
}

export const presetService = new PresetService();
