# V3 插件与系统开发指南 (Plugin & System Dev Guide) 🧩

> 本文档总结了 V3 架构下开发功能模块的核心经验。

## 1. 核心哲学 (Philosophy)

V3 与 V2 的最大区别在于：**去中心化**。
*   **V2**: 功能写在组件里 (`GridEditor.vue`)，数据存在 Store 里 (`gridStore.ts`)。
*   **V3**: 一切皆插件 (`Plugin`)。
    *   **View**: 只负责渲染 (`Component`)。
    *   **Data**: 存放在 ECS Registry (`Entity` + `Component`)。
    *   **Logic**: 由 System 驱动 (`Command Pattern`)。

---

## 2. 开发一个新功能 (How-To)

### 第一步：定义 Plugin
在 `src/v3/plugins` 下创建一个新文件 (如 `MyFeaturePlugin.ts`)。

```typescript
import type { IPlugin } from '../../platform/api/IPlugin';

export const MyFeaturePlugin: IPlugin = {
    id: 'my.feature',
    version: '1.0.0',
    activate(ctx) {
        // 注册你的视图、系统、侧边栏
        console.log('Feature Activated!');
    },
    deactivate(ctx) {
        // 清理副作用
    }
};
```

### 第二步：注册 View (界面)
如果你的功能有一个主界面 (如 网格编辑器、画廊)，注册一个 `View`。

```typescript
ctx.registerView({
    id: 'my.views.main',
    name: 'My Dashboard',
    icon: 'dashboard',
    component: MyComponent // Vue 组件
});
```

### 第三步：使用 ECS 存取数据
不要使用 Pinia！使用 `ctx.registry`。

```typescript
// 写入数据
const eid = ctx.registry.createEntity();
ctx.registry.addComponent(eid, 'Meta', { name: 'Naruto' });

// 读取数据 (在 Vue 组件中)
const registry = getEcsRegistry();
const entities = computed(() => registry.query(['Meta']));
```

### 第四步：使用 Overlay System (弹窗)
不要自己在组件里写 `<Modal>`。使用 `ctx.overlays`。

```typescript
// 在 View 或 System 中
import { overlays } from '.../platform/services/OverlayManager';

const result = await overlays.open(SearchComponent, { type: 'anime' });
if (result) {
    // 处理返回值
}
```

---

## 3. 最佳实践 (Best Practices)

### ✅ Do
*   **保持 View 纯净**: View 组件只负责 `query` ECS 数据并渲染。点击事件应该触发 `Command` 或调用 `System` 方法，而不是直接修改数据。
*   **使用 System 处理逻辑**: 复杂的业务逻辑 (如 自动对齐、数据同步) 应该写成 `class MySystem implements ISystem` 并注册。
*   **依赖注入**: 尽量通过 `activate(ctx)` 获取能力，而不是全局 import。

### ❌ Don't
*   **不要用 Pinia**: 除非是全局用户设置 (如 Theme)，否则业务数据必须进 ECS。
*   **不要直接操作 DOM**: 尤其是在 Grid 渲染中，不要手动 `document.getElementById`。
*   **不要硬编码 Layout**: 你的 View 可能会被加载到 Streamer Mode (全屏) 或 Normal Mode (手机)，确保它是响应式的 (`w-full h-full`)。

---

## 4. V1 迁移经验 (V1 Migration Tips)

当我们把 V1 功能 (如 Search) 搬运到 V3 时：
1.  **抽取逻辑**: 把 `src/logic/xxx.ts` 中的纯函数提取出来 (正如我们复用 `search.ts`)。
2.  **封装 UI**: 把 V1 的组件 (`Search.vue`) 改写为适应 Overlay 的形式 (去掉底部的 store 依赖，改为 props/emits)。
3.  **桥接数据**: 在 `activate()` 中写一段 "初始化代码"，把 `localStorage` 的旧数据读取出来，`createEntity` 塞进 Registry。

---

## 5. 调试技巧
*   **Console**: 也可以直接在控制台输入 `window.__V3_REGISTRY__` (需自行挂载) 来查看当前所有实体。
*   **Vue DevTools**: 因为 ECS state 是 reactive 的，Vue DevTools 依然有效。
