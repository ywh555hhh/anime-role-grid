import { ref, markRaw } from 'vue';
import type { Component } from 'vue';

export interface OverlayOptions {
    id?: string;            // Singleton ID (e.g. 'search-panel')
    priority?: number;      // Z-Index / Order (Default: 100)
    backdrop?: boolean;     // Show dim background? (Default: true)
    closeOnBackdrop?: boolean; // Close when clicking backdrop? (Default: true)
    position?: 'center' | 'top' | 'bottom'; // Layout hint
}

export interface OverlayTask {
    id: string;
    component: Component | string; // Concrete Component or Registered ID
    props: Record<string, any>;
    options: OverlayOptions;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
}

export const OVERLAY_PRIORITY = {
    SYSTEM: 2000,     // Error boundaries, forced updates
    MODAL: 1000,      // Normal dialogs
    DRAWER: 800,      // Side panels / bottom sheets
    POPUP: 500,       // Dropdowns, context menus
    DEFAULT: 0
};

/**
 * Overlay Manager Service
 * Centralized management for Modals, Dialogs, and Floating UI.
 */
class OverlayManager {
    private static instance: OverlayManager;

    // Reactive State
    private _stack = ref<OverlayTask[]>([]);

    public static getInstance(): OverlayManager {
        if (!OverlayManager.instance) {
            OverlayManager.instance = new OverlayManager();
        }
        return OverlayManager.instance;
    }

    /**
     * Get the current overlay stack (sorted by priority is handled by Renderer or CSS z-index)
     * For rendering, we usually just render them in order, but z-index handles the layering.
     */
    public get stack() {
        return this._stack;
    }

    /**
     * Open a generic component as an overlay
     */
    public open<T = any>(
        component: Component | string,
        props: Record<string, any> = {},
        options: OverlayOptions = {}
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const id = options.id || `overlay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // 1. Check for Singleton ID collision
            const existingIndex = this._stack.value.findIndex(t => t.id === id);
            if (existingIndex !== -1) {
                // If already open, bring to front or update props?
                // For now, let's close the old one rejection-free and open new one
                console.warn(`[OverlayManager] Re-opening singleton: ${id}`);
                this.close(id, null);
            }

            const task: OverlayTask = {
                id,
                component: typeof component === 'string' ? component : markRaw(component), // Avoid deep reactive
                props,
                options: {
                    priority: OVERLAY_PRIORITY.MODAL,
                    backdrop: true,
                    closeOnBackdrop: true,
                    position: 'center',
                    ...options
                },
                resolve,
                reject
            };

            this._stack.value.push(task);

            // Sort stack by priority? 
            // Actually, HTML order matters for focus trapping and screen readers.
            // We should render higher priority items LATER in the DOM.
            this._stack.value.sort((a, b) => (a.options.priority || 0) - (b.options.priority || 0));
        });
    }

    /**
     * Close an overlay by ID
     */
    public close(id: string, result?: any) {
        const index = this._stack.value.findIndex(t => t.id === id);
        if (index !== -1) {
            const task = this._stack.value[index];
            if (task) {
                task.resolve(result); // Resolve the promise
            }
            this._stack.value.splice(index, 1);
        }
    }

    /**
     * Close the top-most overlay (Back button support)
     */
    public closeTop(): boolean {
        if (this._stack.value.length === 0) return false;
        const top = this._stack.value[this._stack.value.length - 1];
        if (top) {
            this.close(top.id);
            return true;
        }
        return false;
    }

    public closeAll() {
        this._stack.value.forEach(t => t.resolve(null));
        this._stack.value = [];
    }

    // --- Helpers ---

    public async alert(message: string, title = 'Alert'): Promise<void> {
        // We will implement a Built-in SimpleDialog later
        // For now, use native as fallback or a simple replacement
        console.warn('Need to implement StandardDialog component');
        window.alert(`${title}\n\n${message}`);
    }

    public async confirm(message: string, title = 'Confirm'): Promise<boolean> {
        return window.confirm(`${title}\n\n${message}`);
    }

    public async toast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
        // Dynamically import to avoid top-level dependency if not needed immediately,
        // but vue-sonner is usually a global plugin.
        // Assuming 'vue-sonner' exposes a global or we use the exported 'toast' function.
        // Let's rely on the global 'toast' from 'vue-sonner' if imported.
        // Since we are in a module, we should import it.
        const { toast } = await import('vue-sonner');
        toast[type] ? (toast as any)[type](message) : toast(message);
    }
}

export const overlays = OverlayManager.getInstance();
