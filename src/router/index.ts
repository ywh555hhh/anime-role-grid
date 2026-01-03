import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('~/pages/Home.vue')
    },
    {
        path: '/create',
        name: 'Create',
        component: () => import('~/pages/CreateTemplate.vue')
    },
    {
        path: '/t/:id',
        name: 'Template',
        component: () => import('~/pages/ViewTemplate.vue')
    },
    // V3 Workbench Route
    {
        path: '/v3',
        name: 'V3Workbench',
        component: () => import('~/v3/ui/workbench/Workbench.vue'),
        beforeEnter: async () => {
            // 1. Initialize Platform
            const { getPersistenceService, getEcsRegistry } = await import('~/v3/platform/loader')
            const persistence = getPersistenceService()
            const registry = getEcsRegistry()

            // 2. Start Auto-Save
            persistence.watchForChanges(registry)

            // 3. Load Output Plugins (Views/Docks)
            const { activateBuiltinPlugins } = await import('~/v3/plugins/builtin/index')
            await activateBuiltinPlugins()

            // 4. Restore Session Logic (Fix for Refresh Bug)
            // Instead of hardcoding 'default', we ask PresetService to restore context
            const { presetService } = await import('~/v3/platform/services/PresetService')
            const { useWorkbench } = await import('~/v3/platform/workbench/useWorkbench')
            const workbench = useWorkbench()

            await presetService.restoreSession(workbench)
        }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
