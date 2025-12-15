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
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
