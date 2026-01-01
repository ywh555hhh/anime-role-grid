/**
 * src/v3/platform/loader.ts
 * The "Kernel" loader that bootstraps plugins.
 */
import { WorkbenchRegistry } from './registry';
import { SystemManager } from './managers/SystemManager';
import { Registry } from '../core/ecs/registry';
import type { IPlugin, IPluginContext } from './api/IPlugin';
import type { IView, ISource, IDock } from './contracts';

// Singleton Instances (Lazy init pattern could be better, but this is simple)
const registryInstance = WorkbenchRegistry.getInstance();
const ecsRegistry = new Registry(); // The Global ECS Data Store
const systemManager = new SystemManager(ecsRegistry);

export function getSystemManager() {
    return systemManager;
}

export function getEcsRegistry() {
    return ecsRegistry;
}

/**
 * Loads a plugin into the environment
 */
export async function loadPlugin(plugin: IPlugin) {
    console.log(`[Loader] Loading plugin: ${plugin.id} (${plugin.version})...`);

    const context: IPluginContext = {
        systems: systemManager,
        registry: ecsRegistry,

        registerView(view: IView) {
            registryInstance.registerView(view);
            console.log(`  + View: ${view.id}`);
        },
        registerSource(source: ISource) {
            registryInstance.registerSource(source);
            console.log(`  + Source: ${source.id}`);
        },
        registerDock(dock: IDock) {
            registryInstance.registerDock(dock);
            console.log(`  + Dock: ${dock.id}`);
        }
    };

    try {
        await plugin.activate(context);
        console.log(`[Loader] ✅ ${plugin.id} Activated.`);
    } catch (e) {
        console.error(`[Loader] ❌ Failed to activate ${plugin.id}:`, e);
    }
}
