import { LocalStorageDriver, IndexedDBDriver, type IStorageDriver } from '../storage/drivers';
import type { IProject, IProjectMeta } from '../../core/types/project';

export const GLOBAL_KEYS = {
    LAST_ACTIVE_PROJECT: 'v3_last_active_project',
    THEME: 'v3_theme',
    LOCALE: 'v3_locale',
    META_LIST: 'v3_meta_projects'
};

export class PersistenceManager {
    private local: IStorageDriver;
    private db: IStorageDriver;

    constructor() {
        this.local = new LocalStorageDriver();
        this.db = new IndexedDBDriver();
    }

    // ==========================================
    // Global Scope (Fast, Sync-like)
    // ==========================================

    async getLastActiveProjectId(): Promise<string | undefined> {
        return await this.local.get<string>(GLOBAL_KEYS.LAST_ACTIVE_PROJECT);
    }

    async setLastActiveProjectId(id: string): Promise<void> {
        await this.local.set(GLOBAL_KEYS.LAST_ACTIVE_PROJECT, id);
    }

    async getProjectList(): Promise<IProjectMeta[]> {
        return (await this.local.get<IProjectMeta[]>(GLOBAL_KEYS.META_LIST)) || [];
    }

    async saveProjectMeta(meta: IProjectMeta): Promise<void> {
        const list = await this.getProjectList();
        const existingIndex = list.findIndex(p => p.id === meta.id);

        if (existingIndex >= 0) {
            list[existingIndex] = meta;
        } else {
            list.push(meta);
        }

        await this.local.set(GLOBAL_KEYS.META_LIST, list);
    }

    async deleteProjectMeta(id: string): Promise<void> {
        const list = await this.getProjectList();
        const newList = list.filter(p => p.id !== id);
        await this.local.set(GLOBAL_KEYS.META_LIST, newList);
    }

    // ==========================================
    // Project Scope (Heavy, Async)
    // ==========================================

    async saveProject(project: IProject): Promise<void> {
        console.log(`[PersistenceManager] Saving project: ${project.meta.id} (${project.data.ecs.length} bytes)`);

        // 1. Save Full Data to IDB
        await this.db.set(`project_${project.meta.id}`, project);

        // 2. Update Meta Checkpoint (Global)
        await this.saveProjectMeta(project.meta);
    }

    async loadProject(id: string): Promise<IProject | undefined> {
        console.log(`[PersistenceManager] Loading project: ${id}`);
        return await this.db.get<IProject>(`project_${id}`);
    }

    async deleteProject(id: string): Promise<void> {
        console.log(`[PersistenceManager] Deleting project: ${id}`);
        await this.db.del(`project_${id}`);
        await this.deleteProjectMeta(id);
    }

    // ==========================================
    // Migration Helpers
    // ==========================================

    /**
     * Check if old V3.0 localStorage data exists
     */
    async hasLegacyData(id: string): Promise<boolean> {
        // Old key format: v3_project_{id}
        const raw = await this.local.get(`v3_project_${id}`);
        return !!raw;
    }

    async loadLegacyData(id: string): Promise<string | undefined> {
        return await this.local.get<string>(`v3_project_${id}`);
    }
}

export const persistenceManager = new PersistenceManager();
