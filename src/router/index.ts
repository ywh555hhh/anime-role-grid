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
    {
        // 网络自测：用于定位「图片加载不出来」到底是网络问题还是站点问题
        path: '/netcheck',
        name: 'NetCheck',
        component: () => import('~/pages/NetCheck.vue')
    },
    // V3 Route Removed
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
