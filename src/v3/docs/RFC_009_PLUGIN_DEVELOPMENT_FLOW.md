# RFC 009: 插件开发全流程 SOP (Plugin Development SOP) 🧬

> **Status**: Draft
> **Purpose**: 将“隐性知识”显性化，提供傻瓜式的插件开发导航。

## 0. 开发前的灵魂三问

在写代码之前，先回答这三个问题，你的架构就清晰了一半：

1.  **数据 (Data)**: 我的功能需要存储什么新数据？是否复用现有组件 (Visual/Transform)？
2.  **交互 (Interaction)**: 用户怎么触发我的功能？(点击格子？点击按钮？拖拽？)
3.  **展示 (View)**: 我需要一个新的主界面吗？还是只是给现有的 Grid 增加能力？

---

## Phase 1: 数据定义 (Schema Definition)

**痛点**: "实体应该长什么样？"
**位置**: `src/v3/core/ecs/types.ts` (Core) 或 `src/v3/plugins/my-plugin/types.ts` (Local)

### Step 1.1: 查阅组件字典
先看 `ECS_COMPONENT_DICTIONARY.md`，确认是否已有组件能满足需求。
*   显示图片？ -> 用 `Visual`。
*   定位坐标？ -> 用 `Transform`。
*   需要排序？ -> 用 `Layout`。

### Step 1.2: 扩展组件 (如果需要)
如果现有组件不够（例如你需要存“抽卡概率”），则扩展 `CoreComponentMap`。

```typescript
// src/v3/core/ecs/types.ts
export interface CoreComponentMap {
    // ... existing
    'GachaRate': {
        rate: number;
        isUp: boolean;
    } // [NEW]
}
```

---

## Phase 2: 逻辑实现 (System Implementation)

**痛点**: "业务逻辑写在哪里？"
**位置**: `src/v3/plugins/my-plugin/MySystem.ts`

### Step 2.1: 定义 System 类
系统是逻辑的容器。它通常监听 `Registry` 的变化或 `EventBus` 的事件。

```typescript
import { ISystem, IRegistry } from '../../core/ecs/types';

export class MySystem implements ISystem {
    id = 'my.system';
    priority = 100; // 优先级：越小越早执行 (Layout=10, Render=900)

    init(registry: IRegistry) {
        // 1. 监听事件 (Command / Event)
        // 2. 初始化一些全局 Entity (如 Config)
    }

    // 可选: 如果需要每帧更新 (动画/物理)
    // update(dt, registry) {} 
}
```

### Step 2.2: 实现具体逻辑 (The "Flow")
**口诀**: 监听 Intent -> 执行 Command -> 修改 Registry。

#### 1. 定义命令 (Intent)
首先，在 `activate` 中注册你的命令。

```typescript
// src/v3/plugins/my-plugin/index.ts
ctx.commands.register('my-plugin.make-gold', async ({ rateThreshold }) => {
    const registry = ctx.registry;
    
    // 1. 查询 (Query)
    const entities = registry.query(['GachaRate', 'Visual']);

    // 2. 遍历 (Iterate)
    for (const eid of entities) {
         const rate = registry.getComponent(eid, 'GachaRate');
         const visual = registry.getComponent(eid, 'Visual');

         // 3. 计算 & 修改 (Mutation)
         if (rate.rate > rateThreshold && visual.styleVariant !== 'gold') {
             registry.addComponent(eid, 'Visual', { ...visual, styleVariant: 'gold' });
             
             // 4. 反馈 (Feedback)
             await ctx.commands.execute('ui.toast', { message: `Card ${eid} is now Gold!`, type: 'success' });
         }
    }
});
```

#### 2. 触发命令 (Trigger)
在 UI 或 System 中，我们 **只发送命令**，不直接改数据。

```typescript
// MyView.vue
const handleMakeGold = () => {
    // ✅ Good: Semantically clear, decoupled, recordable.
    ctx.commands.execute('my-plugin.make-gold', { rateThreshold: 0.8 });
}
```

---

## Phase 3: 界面挂载 (View & UI)

**痛点**: "我的 UI 怎么显示出来？"
**位置**: `src/v3/plugins/my-plugin/MyView.vue` 或 `overlays`

### Step 3.1: 决定 UI 类型
*   **View (主视图)**: 占据整个中间画布 (如 Grid, TierList)。
*   **Overlay (弹窗)**: 覆盖在上面 (如 搜索框, 设置)。
*   **Dock (侧边栏)**: 停靠在左右 (如 属性面板)。

### Step 3.2: 编写 Vue 组件 (View 示例)
View 组件的核心职责是 **Query & Render**。不要在 View 里写复杂的业务计算（交给 System）。

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { getEcsRegistry } from '../../platform/loader';

const registry = getEcsRegistry();

// 1. 响应式查询
const items = computed(() => {
    // 只要 ECS 变了，这里自动变
    return Array.from(registry.query(['Visual', 'GachaRate'])).map(id => ({
        id,
        visual: registry.getComponent(id, 'Visual'),
        rate: registry.getComponent(id, 'GachaRate')
    }));
});
</script>

<template>
  <div class="my-view">
     <div v-for="item in items" :key="item.id">
        <!-- 渲染 -->
        <span v-if="item.rate?.rate > 0.5">SSR!</span>
        <img :src="item.visual?.src" />
     </div>
  </div>
</template>
```

---

## Phase 4: 插件组装 (Assembly)

**痛点**: "怎么把这堆东西连起来？"
**位置**: `src/v3/plugins/my-plugin/index.ts`

### Step 4.1: 定义 Plugin 入口
这是插件的“户口本”。

```typescript
import { MySystem } from './MySystem';
import MyView from './MyView.vue';

export const MyPlugin: IPlugin = {
    id: 'my.plugin',
    version: '1.0.0',
    
    activate(ctx) {
        // 1. 注册 System (逻辑)
        ctx.systems.register(new MySystem());

        // 2. 注册 View (界面)
        ctx.registerView({
            id: 'my.view',
            component: MyView,
            icon: 'star'
        });

        // 3. (可选) 注册快捷键 / 菜单 / 侧边栏
    },

    deactivate(ctx) {
        ctx.systems.unregister('my.system');
    }
};
```

### Step 4.2: 在 Loader 中启用
目前在 `src/v3/plugins/builtin/index.ts` 中手动加载（未来会有插件市场）。

```typescript
await loadPlugin(MyPlugin);
```

---

## 总结：你的开发路线图

1.  **想清楚**: 数据结构 (`Type`).
2.  **写逻辑**: 数据怎么变 (`System`).
3.  **画界面**: 数据怎么看 (`View`).
4.  **打包**: 注册到平台 (`Plugin`).

按照这个顺序，**步步为营，不再迷茫**。
