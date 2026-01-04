/**
 * src/v3/platform/loader.ts
 * The "Kernel" loader that bootstraps plugins.
 */
import { WorkbenchRegistry } from './registry';
import { SystemManager } from './managers/SystemManager';
import { Registry } from '../core/ecs/registry';
import type { IPlugin, IPluginContext } from './api/IPlugin';
import type { IView, ISource, IDock } from './contracts';

// 1. Core Singletons
const registryInstance = WorkbenchRegistry.getInstance();
const ecsRegistry = new Registry(); // The Global ECS Data Store
const systemManager = new SystemManager(ecsRegistry);

// 2. Services
import { CommandService } from './services/CommandService';
const commandService = new CommandService();

import { overlays } from './services/OverlayManager';

// Register Standard Commands
commandService.register('ui.alert', (msg) => overlays.alert(msg));
commandService.register('ui.toast', (msg) => overlays.toast(msg));

// [DEPRECATED] Legacy Persistence Service (Kept for export compatibility until full migration)
import { PersistenceService } from './services/PersistenceService';
const persistenceService = new PersistenceService();

import { AssetService } from './services/AssetService';
const assetService = new AssetService();

// 3. Builtin Sources
import { BangumiSource } from '../plugins/builtin/BangumiSource';
import { LocalSource } from '../plugins/builtin/LocalSource';
assetService.registerSource(new BangumiSource());
assetService.registerSource(new LocalSource());

import { presetService } from './services/PresetService';

// 4. Exports
export function getSystemManager() {
    return systemManager;
}

export function getEcsRegistry() {
    return ecsRegistry;
}

export function getCommandService() {
    return commandService;
}

export function getPersistenceService() {
    return persistenceService;
}

export function getAssetService() {
    return assetService;
}

/**
 * Loads a plugin into the environment
 */
export async function loadPlugin(plugin: IPlugin) {
    console.log(`[Loader] Loading plugin: ${plugin.id} (${plugin.version})...`);

    // Register Presets (if any)
    presetService.registerFromPlugin(plugin);

    const context: IPluginContext = {
        systems: systemManager,
        registry: ecsRegistry,
        commands: commandService,
        overlays: overlays,
        assets: assetService,

        registerView(view: IView) {
            registryInstance.registerView(view);
            console.log(`  + View: ${view.id}`);
        },
        registerSource(source: ISource) {
            // Register to AssetService (for Picker) AND WorkbenchRegistry (for System?)
            assetService.registerSource(source);
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
