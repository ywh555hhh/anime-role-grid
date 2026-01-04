import { reactive, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import type { IProject, IProjectMeta } from '../../core/types/project';
import { getEcsRegistry } from '../../platform/loader';
import { persistenceManager, PersistenceManager } from '../managers/PersistenceManager';
import { useWorkbench } from '../../platform/workbench/useWorkbench';

/**
 * ProjectService (Replaces Legacy PresetService)
 * Manages the lifecycle of Projects (Load, Save, Create, Delete)
 */
export class ProjectService {
    // Reactive State for UI
    public currentProject = ref<IProjectMeta | null>(null);
    public projectList = ref<IProjectMeta[]>([]);

    // Internal State
    public persistence: PersistenceManager;

    constructor() {
        this.persistence = persistenceManager;
    }

    /**
     * Initialize Service
     * Load project list from Global Storage
     */
    async init() {
        this.projectList.value = await this.persistence.getProjectList();
        console.log(`[ProjectService] Initialized with ${this.projectList.value.length} projects.`);
    }

    /**
     * Create a new empty project
     */
    async createProject(name: string, templateId: string = 'builtin.templates.blank', customId?: string) {
        // If customId is provided (e.g. for Template-as-Project), use it. Otherwise generate UUID.
        const id = customId || uuidv4();
        const now = Date.now();

        const newProject: IProject = {
            meta: {
                id,
                name,
                version: '3.2.0',
                created: now,
                modified: now,
                activeViewId: 'builtin.views.grid'
            },
            config: {
                activeMode: 'editor',
                modes: {}
            },
            data: {
                ecs: '[]', // Empty Registry
                viewStates: {}
            }
        };

        // TODO: If templateId is provided, we should hydrate 'ecs' from the template.
        // For now, we start empty and let the View initialize defaults.

        await this.persistence.saveProject(newProject);
        await this.refreshList();

        // 5. Activate Auto-Save
        const registry = getEcsRegistry();
        this.startAutoSave(registry);

        return id;
    }

    /**
     * Load a project into the ECS Registry
     */
    async loadProject(id: string) {
        console.log(`[ProjectService] Loading Project ${id}...`);

        // 1. Fetch Data
        const project = await this.persistence.loadProject(id);
        if (!project) {
            console.error(`[ProjectService] Project ${id} not found!`);
            return false;
        }

        const registry = getEcsRegistry();
        const workbench = useWorkbench();

        // 2. Hydrate ECS
        // Clear old state first
        this.clearRegistry(registry);

        if (project.data.ecs && project.data.ecs !== '[]') {
            try {
                registry.deserialize(project.data.ecs);
            } catch (e) {
                console.error('[ProjectService] Failed to deserialize ECS:', e);
                // Fallback?
            }
        }

        // 3. Update Service State
        this.currentProject.value = project.meta;
        await this.persistence.setLastActiveProjectId(id);

        // 4. Restore UI State
        if (project.meta.activeViewId) {
            workbench.switchView(project.meta.activeViewId);
        }

        console.log(`[ProjectService] Project ${id} loaded successfully.`);

        // 5. Activate Auto-Save
        this.startAutoSave(registry);

        return true;
    }

    // Auto-Save Logic
    private isSaving = false;
    private stopWatcher: (() => void) | null = null;

    /**
     * Start watching the registry for changes to trigger auto-save
     */
    public startAutoSave(registry: any) {
        // Stop existing watcher if any
        if (this.stopWatcher) {
            this.stopWatcher();
            this.stopWatcher = null;
        }

        const debouncedSave = useDebounceFn(() => {
            this.saveCurrentProject();
        }, 1000);

        this.stopWatcher = watch(
            () => registry.getSnapshot(),
            () => {
                if (this.isSaving) return;
                debouncedSave();
            },
            { deep: true }
        );

        console.log('[ProjectService] Auto-save active.');
    }

    /**
     * Save the current active project
     */
    async saveCurrentProject() {
        const currentMeta = this.currentProject.value;
        if (!currentMeta) return;

        try {
            this.isSaving = true;
            const registry = getEcsRegistry();
            const workbench = useWorkbench();

            // Debug Stats
            const serialized = registry.serialize();
            const stats = JSON.parse(serialized);
            const entityCount = stats.entities?.length || 0;
            const layoutCount = Object.keys(stats.components?.['Layout'] || {}).length;
            console.log(`[ProjectService] Serialize Stats: ${entityCount} Ents, ${layoutCount} Slots.`);

            const project: IProject = {
                meta: {
                    ...currentMeta,
                    modified: Date.now(),
                    activeViewId: workbench.activeView.value?.id
                },
                config: {
                    // TODO: Capture actual mode config
                    activeMode: 'editor',
                    modes: {}
                },
                data: {
                    ecs: registry.serialize(),
                    // TODO: Capture view states
                    viewStates: {}
                }
            };

            await this.persistence.saveProject(project);

            // Update list cache if name/time changed
            await this.refreshList();

            console.log(`[ProjectService] Auto-Saved ${currentMeta.name}`);
        } catch (e) {
            console.error('[ProjectService] Save Failed:', e);
        } finally {
            this.isSaving = false;
        }
    }

    async deleteProject(id: string) {
        await this.persistence.deleteProject(id);
        if (this.currentProject.value?.id === id) {
            this.currentProject.value = null;
        }
        await this.refreshList();
    }

    private async refreshList() {
        this.projectList.value = await this.persistence.getProjectList();
    }

    private clearRegistry(registry: any) {
        // Stop watcher during clear to avoid saving empty state
        if (this.stopWatcher) {
            this.stopWatcher();
            this.stopWatcher = null;
        }

        // Destroy all entities
        // In V3 ECS, we might need a clearer method
        const snapshot = registry.getSnapshot();
        const entities = Array.from(snapshot.entities) as string[];
        entities.forEach(e => registry.destroyEntity(e));
    }
}

export const projectService = new ProjectService();
