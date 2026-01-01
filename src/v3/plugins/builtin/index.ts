import { defineComponent, h } from 'vue';
import type { IPlugin } from '../../platform/api/IPlugin';
import { loadPlugin } from '../../platform/loader';
import { ZenPlugin } from '../demo/zen';
import { ChaosPlugin } from '../demo/chaos';
import { StandardGridPlugin } from '../grid-standard';

/**
 * Main Entry Point
 */
export async function activateBuiltinPlugins() {
    console.log('[Bootstrapper] 🚀 Launching V3 Plugins...');

    // Load Core (Real V1 Implementation)
    await loadPlugin(StandardGridPlugin);

    // Load Demos
    await loadPlugin(ZenPlugin);
    // await loadPlugin(ChaosPlugin); // Disable Chaos for now to avoid annoyance

    // Set Default State
    const { useWorkbench } = await import('../../platform/workbench/useWorkbench');
    const workbench = useWorkbench();

    // Ensure we start on the Grid
    workbench.switchView('builtin.views.grid');

    // Register mock assets dock for now until we migrate that too
    // Note: Since StandardGridPlugin ONLY registers the View, we lost the "Assets" dock 
    // that was in the mock. I should restore a mock dock or simply let it be empty.
    // Let's add a temporary mock dock here just so the UI isn't empty.

    const TempDockPlugin: IPlugin = {
        id: 'builtin.temp-dock',
        version: '0.0.1',
        activate(ctx) {
            ctx.registerDock({
                id: 'builtin.docks.assets',
                title: 'Assets',
                location: 'left',
                component: defineComponent({
                    setup() {
                        return () => h('div', { class: 'p-4 text-gray-400' }, 'Assets moving to Plugin...');
                    }
                })
            });
        },
        deactivate() { }
    };
    await loadPlugin(TempDockPlugin);
    workbench.togglePanel('builtin.docks.assets');
}
