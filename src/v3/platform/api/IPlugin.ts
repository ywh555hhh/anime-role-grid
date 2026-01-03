/**
 * src/v3/platform/api/IPlugin.ts
 * The Universal Plugin Interface.
 */
import type { IView, ISource, IDock } from '../contracts';
import type { ISystem, IRegistry } from '../../core/ecs/types';
import type { IPreset } from '../../core/types/preset';
import type { IAssetService } from './assets';

// Define the shape of the overlay manager exposed to plugins
export interface IPluginOverlayManager {
    open(component: any, props?: any, options?: any): Promise<any>;
    alert(msg: string): Promise<void>;
    confirm(msg: string): Promise<boolean>;
    close(id: string): void;
}

/**
 * The Sandbox Context passed to plugins during activation.
 * Plugins MUST use this to register their contributions.
 */
import type { IDisposable } from '../contracts';

export interface ICommandService {
    execute<T = any>(id: string, payload?: any): Promise<T>;
    register(
        id: string,
        handler: (payload: any) => Promise<any> | any,
        metadata?: { title?: string; category?: string }
    ): IDisposable;
}

/**
 * The Sandbox Context passed to plugins during activation.
 * Plugins MUST use this to register their contributions.
 */
export interface IPluginContext {
    readonly systems: {
        register(system: ISystem): void;
        unregister(id: string): void;
    };

    readonly registry: IRegistry;

    // Command Bus (The Intent Layer)
    readonly commands: ICommandService;

    // UI Registries
    registerView(view: IView): void;
    registerSource(source: ISource): void;
    registerDock(dock: IDock): void;

    // Overlay Manager
    readonly overlays: IPluginOverlayManager;

    // Asset Service
    readonly assets: IAssetService;
}

/**
 * toolbar action definition
 */
export interface IToolbarContribution {
    id: string;
    icon: string; // e.g. 'i-carbon-template'
    label: string;
    command: string; // Command ID to execute
    // Future: visibleWhen, enableWhen
}

/**
 * The Plugin Manifest Protocol.
 * Every V3 extension must export an object implementing this interface.
 */
export interface IPlugin {
    /** Unique Identifier (e.g. 'builtin.grid-view') */
    readonly id: string;

    /** Semantic Version (e.g. '1.0.0') */
    readonly version: string;

    /** Human readable metadata */
    readonly meta?: {
        name: string;
        description?: string;
        author?: string;
    };

    /**
     * Declarative Contributions
     * UI elements that the plugin contributes to the Shell.
     */
    readonly contributions?: {
        toolbar?: IToolbarContribution[];
    };

    /** 
     * Provided Presets 
     * The system will automatically register these on plugin load.
     */
    readonly presets?: IPreset[];

    /**
     * Activation Hook.
     * Called when the plugin is enabled (or Mode switches to it).
     */
    activate(context: IPluginContext): void | Promise<void>;

    /**
     * Deactivation Hook.
     * Called when the plugin is disabled.
     * Plugins MUST clean up their side effects (unregister systems).
     */
    deactivate(context: IPluginContext): void | Promise<void>;
}
