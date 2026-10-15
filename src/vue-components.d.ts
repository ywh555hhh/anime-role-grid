/**
 * 单文件组件的**精确**模块声明。
 *
 * ## 为什么需要
 *
 * `vue-tsc`（本项目 `npm run build` 与 `vue-tsc -b` 用的就是它）原生能解析 `.vue`，
 * 所以类型检查一直是 0 错误 —— 也因此这个文件看起来「没必要」。
 *
 * 但**纯 tsc 系的工具**（编辑器 LSP、静态检查探针）没有 vue 插件，
 * 遇到 `import('~/pages/HanglaProto.vue')` 会报：
 *
 *     Cannot find module '~/pages/HanglaProto.vue' or its corresponding type declarations.
 *                                                              ↑
 *     后半句是重点：TS 在说「我没有这个模块的类型声明」。
 *
 * ## 为什么不用常见的 `declare module '*.vue'`
 *
 * 那是最常见的写法，但**在本仓库是有害的**：`*` 会匹配**任何** `.vue` 路径，
 * 于是 `.vue` 的路径校验被全局关掉，打错的组件名/放错的目录都会被静默吞掉。
 * 实验（可复现）：
 *
 *     // 故意写一个不存在的组件
 *     import Missing from '~/pages/ThisFileDoesNotExist.vue'
 *
 *     有 declare module '*.vue' 时 → vue-tsc 0 错误        ❌ 错误被吞
 *     没有它时                    → error TS2307          ✅ 正确报错
 *
 * ## 所以这里逐个列出真实文件
 *
 * 只声明**确实存在**的组件。这样：
 *   - 纯 tsc 系工具能解析它们（报错消失）
 *   - 打错的路径依然匹配不到任何声明 → 仍然 TS2307 ✅ 校验没有被削弱
 *   - `.d.ts` 是纯类型文件，对构建产物零影响（同一份构建产物哈希不变）
 *
 * TS 解析模块时优先使用真实文件，通配/环境声明只作兜底，
 * 因此 vue-tsc 下 SFC 的 props / emits 推导不受影响。
 *
 * ## 维护约定
 *
 * **新增页面时要在下面补一条**，否则纯 tsc 系工具仍会报找不到模块。
 * 删除页面时（比如原型验证完）也要把对应声明删掉。
 */

declare module '~/pages/Home.vue' {
    import type { DefineComponent } from 'vue'

    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
    export default component
}

declare module '~/pages/CreateTemplate.vue' {
    import type { DefineComponent } from 'vue'

    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
    export default component
}

declare module '~/pages/ViewTemplate.vue' {
    import type { DefineComponent } from 'vue'

    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
    export default component
}

declare module '~/pages/NetCheck.vue' {
    import type { DefineComponent } from 'vue'

    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
    export default component
}

declare module '~/pages/HanglaProto.vue' {
    import type { DefineComponent } from 'vue'

    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
    export default component
}
