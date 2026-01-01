import { defineComponent, h } from 'vue';
import type { IPlugin } from '../../platform/api/IPlugin';
import { loadPlugin } from '../../platform/loader';
import { ZenPlugin } from '../demo/zen';
import { ChaosPlugin } from '../demo/chaos';

/**
 * The "Standard Standard" Plugin
 * Defines the core Grid Experience.
 */
const BuiltinCorePlugin: IPlugin = {
    id: 'builtin.core',
    version: '3.0.0',
    activate(ctx) {
        // 1. Mock Grid View logic
        ctx.registerView({
            id: 'builtin.views.grid',
            name: 'Standard Grid',
            icon: 'grid-icon',
            component: defineComponent({
                setup() {
                    return () => h('div', { class: 'p-10 bg-grid-pattern h-full' }, [
                        h('h2', { class: 'text-2xl font-serif text-gray-800' }, '我推的格子 (Canvas Area)'),
                        h('p', { class: 'mt-4 text-gray-500' }, 'Loaded via Plugin System.')
                    ]);
                }
            }),
            capabilities: { zoom: true, export: true, culling: true }
        });

        // 2. Mock Assets Dock logic
        ctx.registerDock({
            id: 'builtin.docks.assets',
            title: 'Assets',
            location: 'left',
            component: defineComponent({
                setup() {
                    return () => h('div', { class: 'p-4' }, [
                        h('div', { class: 'bg-pink-50 p-4 rounded mb-2 border border-pink-100' }, 'Character A'),
                        h('div', { class: 'bg-blue-50 p-4 rounded mb-2 border border-blue-100' }, 'Character B'),
                    ]);
                }
            })
        });
    },
    deactivate() { }
};

/**
 * Main Entry Point
 */
export async function activateBuiltinPlugins() {
    console.log('[Bootstrapper] 🚀 Launching V3 Plugins...');

    // Load Core
    await loadPlugin(BuiltinCorePlugin);

    // Load Demos
    await loadPlugin(ZenPlugin);
    await loadPlugin(ChaosPlugin);

    // Set Default State (Ideally this should be "Session Restore")
    const { useWorkbench } = await import('../../platform/workbench/useWorkbench');
    const workbench = useWorkbench();
    workbench.switchView('builtin.views.grid');
    workbench.togglePanel('builtin.docks.assets');
}
