import { projectService } from './services/ProjectService';
import { checkAndMigrateV3_0 } from './storage/migration';
import { persistenceManager } from './managers/PersistenceManager';

export async function bootstrapV3() {
    console.log('[Boot] 🚀 Starting V3.2 Persistence Layer...');

    // 1. Run Migration Guard
    await checkAndMigrateV3_0();

    // 2. Initialize Project Service
    await projectService.init();

    // 3. Determine Last Active Project
    const lastId = await persistenceManager.getLastActiveProjectId();

    if (lastId) {
        console.log(`[Boot] Found last active project: ${lastId}`);
        const success = await projectService.loadProject(lastId);
        if (!success) {
            console.warn('[Boot] Failed to load last project. Creating new one...');
            await createDefaultProject();
        }
    } else {
        console.log('[Boot] No history found. Creating default project...');
        await createDefaultProject();
    }
}

async function createDefaultProject() {
    const id = await projectService.createProject('My First Grid');
    await projectService.loadProject(id);
}
