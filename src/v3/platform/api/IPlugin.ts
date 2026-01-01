/**
 * src/v3/platform/api/IPlugin.ts
 * The Universal Plugin Interface.
 */
import type { IView, ISource, IDock } from '../contracts';
import type { SystemManager } from '../managers/SystemManager';
import type { IRegistry } from '../../core/ecs/types';

/**
 * The Sandbox Context passed to plugins during activation.
 * Plugins MUST use this to register their contributions.
 */
export interface IPluginContext {
    /** Access to the System Manager for registering ECS Systems */
    systems: SystemManager;

    /** Access to the Registry (ReadOnly suggested, but ReadWrite needed for init) */
    registry: IRegistry;

    // Contribution APIs
    registerView(view: IView): void;
    registerSource(source: ISource): void;
    registerDock(dock: IDock): void;
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
