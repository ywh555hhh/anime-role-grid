import { reactive, shallowReadonly } from 'vue';
import type { IView, ISource, IDock } from './contracts';

/**
 * The Singleton Registry for all Platform Contributions.
 * Connects the "Kernel" to the "Extensions".
 */
export class WorkbenchRegistry {
    private static instance: WorkbenchRegistry;

    // Use Vue's reactive system to bind UI directly to definitions
    private state = reactive({
        views: new Map<string, IView>(),
        sources: new Map<string, ISource>(),
        docks: new Map<string, IDock>()
    });

    private constructor() { }

    public static getInstance(): WorkbenchRegistry {
        if (!WorkbenchRegistry.instance) {
            WorkbenchRegistry.instance = new WorkbenchRegistry();
        }
        return WorkbenchRegistry.instance;
    }

    // --- Registration Methods ---

    registerView(view: IView): void {
        if (this.state.views.has(view.id)) {
            console.warn(`[WorkbenchRegistry] View '${view.id}' is already registered.`);
            return;
        }
        this.state.views.set(view.id, view);
    }

    registerSource(source: ISource): void {
        if (this.state.sources.has(source.id)) {
            console.warn(`[WorkbenchRegistry] Source '${source.id}' is already registered.`);
            return;
        }
        this.state.sources.set(source.id, source);
    }

    registerDock(dock: IDock): void {
        if (this.state.docks.has(dock.id)) {
            console.warn(`[WorkbenchRegistry] Dock '${dock.id}' is already registered.`);
            return;
        }
        this.state.docks.set(dock.id, dock);
    }

    // --- Accessors (ReadOnly for UI) ---

    get views() {
        return shallowReadonly(this.state.views);
    }

    get sources() {
        return shallowReadonly(this.state.sources);
    }

    get docks() {
        return shallowReadonly(this.state.docks);
    }

    /**
     * Helper to get a view by ID
     */
    getView(id: string): IView | undefined {
        return this.state.views.get(id);
    }
}
