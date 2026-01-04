import { reactive, ref } from 'vue';
import type { IPreset } from '../../core/types/preset';
import type { IPlugin } from '../../platform/api/IPlugin';
import { getEcsRegistry } from '../../platform/loader';
import { projectService, ProjectService } from './ProjectService';

class PresetService {
    // Reactive storage for UI
    private presets = reactive<IPreset[]>([]);
    public currentPreset = ref<IPreset | null>(null);

    // Dependencies
    private projectService: ProjectService;

    constructor() {
        this.projectService = projectService;
    }

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
     * Apply a preset (Switch Project)
     * Delegates to ProjectService to maintain "One Project Per Template" behavior (for now)
     */
    async applyPreset(preset: IPreset, _workbench: any) {
        console.log(`[PresetService] Applying preset: ${preset.name} (${preset.id})`);

        // 1. Save current project before switching
        await this.projectService.saveCurrentProject();

        // 2. Check if project exists for this preset
        const exists = await this.projectService.persistence.loadProject(preset.id);

        if (exists) {
            // Load existing state
            await this.projectService.loadProject(preset.id);
        } else {
            // Create new project from preset
            // We force the ID to match preset.id to simulate "Save Slot" behavior
            await this.projectService.createProject(preset.name, preset.id, preset.id);

            // Hydrate with Preset Config (Columns, Title, etc.)
            // The ProjectService created an empty ECS. We need to inject the GenerateGrid command.
            const registry = getEcsRegistry();
            if (preset.data.config) {
                const cmdId = registry.createEntity();
                registry.addComponent(cmdId, 'Command', {
                    type: 'GENERATE_GRID',
                    payload: preset.data.config
                });
                // Save the initial state immediately
                await this.projectService.saveCurrentProject();
            }
        }

        this.currentPreset.value = preset;
    }
}

export const presetService = new PresetService();
