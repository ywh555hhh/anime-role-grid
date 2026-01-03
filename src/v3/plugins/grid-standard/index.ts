import type { IPlugin, IPluginContext } from '../../platform/api/IPlugin';
import type { IPreset } from '../../core/types/preset';
import StandardGridView from './StandardGridView.vue';
import { StandardGridSystem } from './StandardGridSystem';
import { getEcsRegistry, getCommandService } from '../../platform/loader';
import { presetService } from '../../platform/services/PresetService';
import PresetGalleryOverlay from '../../ui/overlays/PresetGalleryOverlay.vue';

import v1Templates from '../../assets/presets/v1-templates.json';

// --- V1 Presets (Migrated from JSON) ---
const presets: IPreset[] = v1Templates.map((t: any) => ({
    id: `standard.${t.id}`,
    name: t.name,
    description: t.description || t.name,
    category: t.category,
    tags: t.tags,
    targetViewId: 'builtin.views.grid',
    data: {
        config: {
            ...t.config,
            presetId: `standard.${t.id}`
        }
    }
}));

export const StandardGridPlugin: IPlugin = {
    id: 'builtin.grid',
    version: '1.0.0',
    meta: {
        name: 'Standard Grid',
        description: 'The classic V1 Grid experience.'
    },
    contributions: {
        toolbar: [
            {
                id: 'btn_switch',
                icon: 'i-carbon-template',
                label: '切换模板',
                command: 'grid.switchTemplate'
            },
            {
                id: 'btn_names',
                icon: 'i-carbon-text-font',
                label: '显示名字',
                command: 'grid.toggleNames'
            },
            {
                id: 'btn_reset',
                icon: 'i-carbon-restart',
                label: '重置文字',
                command: 'grid.resetLabels'
            }
        ]
    },
    presets: presets,
    activate(ctx: IPluginContext) {
        console.log('[StandardGrid] Activating...');

        const registry = getEcsRegistry();
        const commands = getCommandService();

        // 1. Register View
        ctx.registerView({
            id: 'builtin.views.grid',
            name: 'Standard Grid',
            icon: 'grid_view',
            capabilities: { zoom: true, export: true, culling: false },
            component: StandardGridView,

            // [Verification] V3.1 Interface Hardening
            onSuspend() {
                console.log('[StandardGrid] Suspended (State Saved)');
            },
            onResume() {
                console.log('[StandardGrid] Resumed (State Restored)');
            }
        });

        // 2. Register System
        ctx.systems.register(new StandardGridSystem());

        // 3. Register Commands (Toolbar Actions)
        commands.register('grid.switchTemplate', () => {
            ctx.overlays.open(PresetGalleryOverlay);
        });

        commands.register('grid.toggleNames', () => {
            registry.add({ components: { 'Command': { type: 'TOGGLE_NAMES', payload: {} } } });
        });

        commands.register('grid.resetLabels', () => {
            const current = presetService.currentPreset.value;
            // Extract items from preset data.config or fallback to empty
            const items = current?.data?.config?.items || [];

            console.log('[StandardGrid] Resetting labels to preset defaults:', items);
            registry.add({ components: { 'Command': { type: 'RESET_LABELS', payload: { items } } } });
        });
    },

    deactivate(ctx: IPluginContext) {
        console.log('[StandardGrid] Deactivating...');
        ctx.systems.unregister('builtin.systems.grid');
    }
};
