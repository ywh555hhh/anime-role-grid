/**
 * Project Data Structure for V3
 */

export interface IProjectMeta {
    id: string;
    name: string;
    version: string;
    created: number;
    modified: number;
    thumbnail?: string;
    activeViewId?: string; // Last active view
}

export interface IProjectConfig {
    activeMode: string; // 'editor' | 'streamer'
    modes: Record<string, any>; // Serialized mode config (docks, layouts)
}

/**
 * The Full Project Bundle (Stored in IndexedDB)
 */
export interface IProject {
    meta: IProjectMeta;
    config: IProjectConfig;

    // Core Data
    data: {
        // The ECS Registry Snapshot
        ecs: string;

        // View States (Scroll pos, selection, etc)
        viewStates: Record<string, any>;
    };
}
