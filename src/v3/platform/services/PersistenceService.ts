import { watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import type { Registry } from '../../core/ecs/registry';

const STORAGE_PREFIX = 'v3_project_';
const METADATA_KEY = 'v3_meta_projects';
const DEFAULT_PROJECT_ID = 'default';

export interface IProjectMeta {
    id: string;
    name: string;
    lastModified: number;
}

export class PersistenceService {
    private currentProjectId: string = DEFAULT_PROJECT_ID;
    private isSaving = false;

    /**
     * Save the entire registry state to LocalStorage
     */
    save(projectId: string, registry: Registry): void {
        try {
            this.isSaving = true;
            console.log(`[Persistence] Saving project: ${projectId}...`);
            const json = registry.serialize();
            localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, json);

            // Update Metadata
            this.updateMetadata(projectId);

            console.log(`[Persistence] Saved ${json.length} bytes.`);
        } catch (e) {
            console.error('[Persistence] Save failed:', e);
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Load registry state from LocalStorage
     */
    load(projectId: string, registry: Registry): boolean {
        try {
            console.log(`[Persistence] Loading project: ${projectId}...`);
            // Always switch context, even if empty
            this.currentProjectId = projectId;
            this.saveLastActive(projectId);

            const json = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);

            if (!json) {
                console.warn(`[Persistence] No data found for project: ${projectId}`);
                return false;
            }

            registry.deserialize(json);
            return true;
        } catch (e) {
            console.error('[Persistence] Load failed:', e);
            return false;
        }
    }

    /**
     * Start auto-saving on changes
     */
    watchForChanges(registry: Registry, debounceMs: number = 1000): void {
        const debouncedSave = useDebounceFn(() => {
            this.save(this.currentProjectId, registry);
        }, debounceMs);

        // Deep watch the reactive state of the registry
        // Registry.state is shallowReactive, but nested Maps need deep watching
        // or specific triggers.
        // For V3 Registry, we might just watch the getSnapshot() or specific indices.
        // Since we want to capture ANY change, deep watch on state is heavy but safest.

        watch(
            () => registry.getSnapshot(),
            (_newState) => {
                if (this.isSaving) return; // Skip updates caused by save (if any - unlikely)
                debouncedSave();
            },
            { deep: true }
        );

        console.log('[Persistence] Auto-save watcher attached.');
    }

    getLastActiveId(): string {
        return localStorage.getItem('v3_last_active_project') || DEFAULT_PROJECT_ID;
    }

    private saveLastActive(id: string) {
        localStorage.setItem('v3_last_active_project', id);
    }

    private updateMetadata(id: string) {
        const metaStr = localStorage.getItem(METADATA_KEY);
        let list: IProjectMeta[] = metaStr ? JSON.parse(metaStr) : [];

        const existing = list.find(p => p.id === id);
        if (existing) {
            existing.lastModified = Date.now();
        } else {
            list.push({
                id,
                name: `Project ${id}`, // Default name
                lastModified: Date.now()
            });
        }

        localStorage.setItem(METADATA_KEY, JSON.stringify(list));
    }
}
