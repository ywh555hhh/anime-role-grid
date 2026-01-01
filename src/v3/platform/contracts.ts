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
    // Triggered when this view becomes the active Main View
    // Use this to register your LayoutSystems or EventListeners
    onActivate?: (world: Registry) => void;

    // Triggered when navigating away from this view
    // Use this to cleanup specific systems
    onDeactivate?: (world: Registry) => void;

    // capabilities
    capabilities: {
        zoom: boolean;
        export: boolean;
        culling: boolean;
        // Content filtering: What entity types does this view support?
        // e.g. ['Character', 'Item']
        accepts?: string[];
    };
}

/**
 * --- 2. The Source Protocol (Data Origin) ---
 * Represents a data provider (Bangumi, Steam, Local)
 */

export interface SourceItem {
    id: string;
    thumbnail: string;
    title: string;
    // Allow extra props but enforce the basics
    [key: string]: any;
}

export interface SourceResult {
    items: SourceItem[];
    hasMore: boolean;
    nextPage?: number;
}

export interface ISource {
    id: string;          // e.g. 'builtin.sources.bangumi'
    name: string;

    // The Search Capability
    search(query: string, page: number): Promise<SourceResult>;

    // The Drag Payload: What happens when I drag an item from here?
    // It must return a "Draft Entity" (Components) to be injected into the Registry
    normalize(item: SourceItem): Record<string, any>;
}

/**
 * --- 3. The Dock Protocol (Holding Areas) ---
 * Represents a container panel (Gacha, Clipboard, Trash, etc.)
 */
export interface IDock {
    id: string;
    title: string;
    location: 'left' | 'right' | 'bottom';

    // Can it accept drops?
    accepts?: (entity: any) => boolean;

    component: Component | (() => Promise<Component>);
}
