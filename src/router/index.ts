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
        // PROTOTYPE：/hangla 的「手机端排序交互」方案对比原型。
        // 只回答一个问题——A 托盘+点层 / B 弹层选层 / C 长按拖拽，哪种在手机上更顺手。
        // 验证完即删（连带 src/pages/hangla-proto-items.ts）。
        path: "/hangla-proto",
        name: "HanglaProto",
        component: () => import("~/pages/HanglaProto.vue"),
    },
    // V3 Route Removed
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
