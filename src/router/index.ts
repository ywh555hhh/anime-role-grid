import { createRouter, createWebHistory } from "vue-router";

const routes = [
    {
        path: "/",
        name: "Home",
        component: () => import("~/pages/Home.vue"),
    },
    {
        path: "/create",
        name: "Create",
        component: () => import("~/pages/CreateTemplate.vue"),
    },
    {
        path: "/t/:id",
        name: "Template",
        component: () => import("~/pages/ViewTemplate.vue"),
    },
    {
        // 网络自测：用于定位「图片加载不出来」到底是网络问题还是站点问题
        path: "/netcheck",
        name: "NetCheck",
        component: () => import("~/pages/NetCheck.vue"),
    },
    {
        // PROTOTYPE：/hangla —— tier list 制作器（把作品/角色从「夯」排到「拉」）。
        //
        // 路径必须用 /hangla：导出的图片里那个二维码指向的就是它，
        // 用别的路径（之前是 /hangla-proto）扫码会打开一个空白页。
        // /hangla-proto 保留为别名，已经发出去的测试链接不会失效。
        //
        // 验证完即删（连带 src/pages/hangla-proto-items.ts、src/logic/hanglaDraw.ts、
        // src/logic/protoMemory.ts）。
        path: "/hangla",
        alias: "/hangla-proto",
        name: "HanglaProto",
        // 注：纯 tsc 系的静态检查会在这里报
        //   Cannot find module '~/pages/HanglaProto.vue' or its corresponding type declarations
        // 那是假阳性（探针逐文件孤立编译、不加载 vue 插件与项目 .d.ts），
        // vue-tsc / vite build / 线上都是正常的。
        // 不要用 `declare module '*.vue'` 去消 —— 那会关闭全项目的 .vue 路径校验。
        // 详见 docs/lens-false-positives.md（附可复现实验）。
        component: () => import("~/pages/HanglaProto.vue"),
    },
    {
        // 兜底：匹配不到的地址**绝不能**静默渲染空白。
        // 之前任何拼错的 URL（比如路由叫 /hangla-proto 而用户访问 /hangla）
        // 都会得到一片空白，看起来就像站点坏了——实际上只是没匹配到路由。
        path: "/:pathMatch(.*)*",
        redirect: "/",
    },
    // V3 Route Removed
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
