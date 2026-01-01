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
            const { activateBuiltinPlugins } = await import('~/v3/plugins/builtin/index')
            activateBuiltinPlugins()
        }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
