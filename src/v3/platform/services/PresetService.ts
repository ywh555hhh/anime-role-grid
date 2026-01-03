import { reactive, ref } from 'vue';
import type { IPreset } from '../../core/types/preset';
import type { IPlugin } from '../../platform/api/IPlugin';
import { getEcsRegistry, getPersistenceService } from '../../platform/loader';

class PresetService {
    // Reactive storage for UI
    private presets = reactive<IPreset[]>([]);
    public currentPreset = ref<IPreset | null>(null);
    private currentProjectId = 'default';

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
     * 1. Save Current State
     * 2. Try Load Saved Persistence
     * 3. Fallback to Fresh Generation
     */
    async restoreSession(workbench: any) {
        const persistence = getPersistenceService();
        const registry = getEcsRegistry();
        const lastId = persistence.getLastActiveId();

        console.log('[PresetService] Restoring session:', lastId);

        const target = this.presets.find(p => p.id === lastId);
        if (target) {
            // Restore context
            this.currentProjectId = target.id;
            this.currentPreset.value = target;
            workbench.switchView(target.targetViewId);

            // Load Data
            await this.loadPresetData(target, registry, persistence);
        } else {
            console.warn(`[PresetService] Last active preset '${lastId}' not found. Falling back to default.`);
            // Fallback: Try to find ANY preset or just leave empty
            const first = this.presets[0];
            if (first) {
                this.currentProjectId = first.id;
                this.currentPreset.value = first;
                workbench.switchView(first.targetViewId);
                await this.loadPresetData(first, registry, persistence);
            }
        }
    }

    private async loadPresetData(preset: IPreset, registry: any, persistence: any) {
        // 2. Try Load Saved State
        let loaded = persistence.load(preset.id, registry);

        // 2.1 Validate Loaded State (Strict Integrity Check)
        if (loaded) {
            const stateId = Array.from(registry.query(['GridState']))[0];
            const state = stateId ? registry.getComponent(stateId, 'GridState') : null;

            // Strict Validation: Must have State, Must have ID, Must Match.
            if (!state || !state.presetId || state.presetId !== preset.id) {
                console.warn(`[PresetService] Integrity Check Failed for ${preset.id}.`);
                loaded = false;
            } else {
                // Deep Content Validation (Cols check)
                const expectedCols = preset.data.config?.cols;
                if (expectedCols && state.cols !== expectedCols) {
                    console.warn(`[PresetService] Structure Mismatch! Expected cols=${expectedCols}, found ${state.cols}. Discarding.`);
                    loaded = false;
                } else {
                    console.log(`[PresetService] Integrity Check Passed. Restored state for ${preset.id}`);
                    return;
                }
            }
        }

        // 3. Fallback: Generate Fresh Grid
        console.log(`[PresetService] No saved state/corrupted. Generating fresh grid.`);

        // Clear Registry
        const snapshot = registry.getSnapshot();
        const allEntities = Array.from(snapshot.entities);
        for (const eid of allEntities) {
            registry.destroyEntity(eid);
        }

        if (preset.data.config) {
            const cmdId = registry.createEntity();
            registry.addComponent(cmdId, 'Command', {
                type: 'GENERATE_GRID',
                payload: preset.data.config
            });
        }
    }

    /**
     * The Core "Load" Logic
     */
    async applyPreset(preset: IPreset, workbench: any) {
        console.log(`[PresetService] Applying preset: ${preset.name} (${preset.id})`);
        const registry = getEcsRegistry();
        const persistence = getPersistenceService();

        // 1. Save current state
        if (this.currentProjectId) {
            persistence.save(this.currentProjectId, registry);
        }

        // Update Context
        this.currentProjectId = preset.id;
        this.currentPreset.value = preset;

        // Switch View (Synchronous for now)
        workbench.switchView(preset.targetViewId);

        // 2. Load Data
        await this.loadPresetData(preset, registry, persistence);
    }
}

export const presetService = new PresetService();
