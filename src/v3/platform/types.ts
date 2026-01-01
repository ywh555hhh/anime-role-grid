/**
 * Common types for the Platform Layer
 */

/**
 * Context passed to plugins during initialization
 */
export interface ExtensionContext {
    globalState: Map<string, any>;
    workspaceState: Map<string, any>;
}

/**
 * Registry access context for Commands
 */
export interface CommandContext {
    // Placeholder for future Command Registry connection
    registry: any;
}
