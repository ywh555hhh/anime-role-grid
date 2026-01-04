import { persistenceManager, GLOBAL_KEYS } from '../managers/PersistenceManager';
import type { IProject } from '../../core/types/project';

/**
 * Migration Guard: V3.0 (LocalStorage) -> V3.2 (IndexedDB)
 */
export async function checkAndMigrateV3_0() {
    console.log('[Migration] Checking for legacy V3.0 data...');

    // 1. Check if we already have a V3.2 project history
    const metaList = await persistenceManager.getProjectList();
    if (metaList.length > 0) {
        console.log('[Migration] V3.2 data found. Skipping migration.');
        return;
    }

    // 2. Check for Legacy Last Active ID
    // In V3.0, we stored 'v3_last_active_project' in localStorage
    const legacyId = localStorage.getItem(GLOBAL_KEYS.LAST_ACTIVE_PROJECT);
    if (!legacyId) {
        console.log('[Migration] No legacy active project found.');
        return;
    }

    console.log(`[Migration] Found legacy project ID: ${legacyId}. Attempting migration...`);

    // 3. Load Legacy Data (Raw JSON string)
    // The key format was 'v3_project_{id}'
    const legacyKey = `v3_project_${legacyId}`;
    const rawJson = localStorage.getItem(legacyKey);

    if (!rawJson) {
        console.warn(`[Migration] Legacy ID ${legacyId} found but data is missing.`);
        return;
    }

    // 4. Construct New IProject Structure
    const newProject: IProject = {
        meta: {
            id: legacyId,
            name: 'Migrated Project', // We didn't store names in V3.0
            version: '3.0.0', // Legacy version
            created: Date.now(),
            modified: Date.now(),
            activeViewId: 'builtin.views.grid' // Default view
        },
        config: {
            activeMode: 'editor',
            modes: {}
        },
        data: {
            ecs: rawJson,
            viewStates: {}
        }
    };

    // 5. Save to New System (IndexedDB)
    try {
        await persistenceManager.saveProject(newProject);
        await persistenceManager.setLastActiveProjectId(legacyId);

        console.log('[Migration] ✅ Migration Successful! Legacy data moved to IndexedDB.');

        // Optional: Mark legacy as migrated (don't delete yet for safety)
        localStorage.setItem(`${legacyKey}_migrated`, 'true');

    } catch (e) {
        console.error('[Migration] ❌ Migration Failed:', e);
    }
}
