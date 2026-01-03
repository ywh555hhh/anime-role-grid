import type { Component } from 'vue';
import type { Registry } from '../core/ecs/registry';

// Common Disposable Interface (VS Code Pattern)
export interface IDisposable {
    dispose(): void;
}

/**
 * --- 1. The View Protocol (Middle Screen) ---
 * Represents a visualization of the data (Grid, Pyramid, etc.)
 */
export interface IView {
    id: string;          // e.g. 'builtin.views.grid'
    name: string;        // e.g. 'Standard Grid'
    icon: string;        // Icon class or SVG path

    // The Factory: Vue Component or Async Factory
    component: Component | (() => Promise<Component>);

    // [Lifecycle Hooks]

    /**
     * Called when the view becomes the active view.
     * @param world The Registry instance (View-Scoped in Phase 4)
     */
    onActivate?: (world: Registry) => void | Promise<void>;

    /**
     * Called when the view is switched away from.
     * @param world The Registry instance
     */
    onDeactivate?: (world: Registry) => void | Promise<void>;

    /**
     * [New in V3.1] Called when the view is about to be suspended (hidden but kept in memory).
     * Used to save transient state (scroll position, input focus).
     */
    onSuspend?: () => void;

    /**
     * [New in V3.1] Called when the view is resumed from suspension.
     * Used to restore transient state.
     */
    onResume?: () => void;

    /** 
     * [New in V3.1] Persistent State Container.
     * Any data written here will be preserved during suspension.
     */
    state?: Record<string, any>; // e.g. { scrollY: 100, selectedId: 'foo' }

    capabilities: {
        zoom: boolean;
        export: boolean;
        culling: boolean;
        accepts?: string[]; // MIME types or Entity types
    };
}

// ==========================================
// 3. Source System (The "Supply Chain")
// ==========================================

/**
 * Represents the raw data from a source (Local File, API Response).
 * MUST be validated against AssetSchema at runtime.
 */
export interface SourceItem {
    id: string;
    thumbnail: string;
    title: string;
    // Allow extra props but enforce the basics via Schema
    [key: string]: any;
}

export interface SourceResult {
    items: SourceItem[];
    total: number;
    hasMore: boolean;
}

/**
 * Capability flags for Sources.
 * Allows UI to adapt (e.g. hide "Next Page" button).
 */
export interface SourceCapabilities {
    search: boolean;      // Can search by query?
    pagination: boolean;  // Has generic pagination?
    recommend: boolean;   // Can recommend without query?
    upload: boolean;      // Supports file upload?
}

export interface ISource {
    id: string;
    name: string;

    // [New in V3.1] Capability Flags
    capabilities: SourceCapabilities;

    search(query: string, page: number, options?: Record<string, any>): Promise<SourceResult>;
    recommend?(options?: Record<string, any>): Promise<SourceItem[]>;

    /**
     * Normalize raw item into standard Entity Components.
     * This is the "Adapter" layer.
     */
    normalize(item: SourceItem): Record<string, any>;
}

// ==========================================
// 4. Dock System (The "Toolbox")
// ==========================================
export interface IDock extends IDisposable {
    id: string;
    title: string;
    location: 'left' | 'right' | 'bottom';

    // Can it accept drops?
    accepts?: (entity: any) => boolean;

    component: Component | (() => Promise<Component>);
}
