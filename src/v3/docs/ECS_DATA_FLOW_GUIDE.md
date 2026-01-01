# ECS 数据流转指南 (The Life of an Entity) 🌊

> **Status**: Draft
> **Purpose**: 彻底讲清楚数据在 V3 引擎中是如何流动的。从用户点击到屏幕像素变化的完整链路。

## 1. 宏观链路 (The Big Picture)

V3 的数据流是一个 **单向环**：

```mermaid
graph LR
    User[用户交互] -->|Event/Command| Logic[System 逻辑]
    Logic -->|Mutation| Registry[Registry 数据库]
    Registry -->|Reactivity| View[View 视图]
    View -->|Render| User
```

1.  **Input**: 用户交互不直接改数据，而是产生 `Command` 或 `Event`。
2.  **Process**: `System` 监听这些信号，根据规则修改 `Registry` 中的组件。
3.  **State**: `Registry` 是唯一真理来源 (Source of Truth)。
4.  **Output**: `View` 通过 `computed` 自动响应 `Registry` 的变化，更新 DOM。

---

## 2. 深度剖析：一次“拖拽”的旅程

让我们跟踪一个卡片 (Entity A) 从 **暂存区** 被拖进 **网格** 的全过程。

### Phase 1: 交互 (Interaction)

**场景**: 用户按住鼠标拖动卡片。

1.  **View 层 (`useDrag.ts`)**: 
    *   监听 `mousedown`。
    *   调用 `registry.addComponent(id, 'Interaction', { isDragging: true })`。
    *   **注意**: 此时 `View` **直接** 修改了 Transient 组件 (Interaction)，因为这是纯 UI 状态，不涉及业务规则验证，允许“短路”。

2.  **System 层 (`InteractionSystem`)**:
    *   (如果有) 可能会监听 `Interaction` 组件的变化，以此来高亮合法的投放区域 (Drop Zones)。

### Phase 2: 提交 (Commit)

**场景**: 用户在某个 Slot 上松开鼠标。

1.  **View 层 (`useDrag.ts`)**: 
    *   检测到 `mouseup`。
    *   判断落点是否在 Slot 上。
    *   **关键点**: View **不** 直接修改 `Visual` 或 `Layout`。它派发一个指令！
    *   `eventBus.emit('entity:snapped', { entityId: 'A', slotId: 'Slot_1' })`

### Phase 3: 逻辑 (Logic)

**场景**: 系统接管控制权。

1.  **System 层 (`GridSystem` 或 `LayoutSystem`)**:
    *   监听 `entity:snapped` 事件。
    *   **读取**: 获取 Entity A 的数据，获取 Slot 1 的数据。
    *   **验证**: 检查 Slot 1 是否锁住？Entity A 是否兼容？
    *   **修改 (Mutation)**: 
        ```typescript
        registry.batch(() => {
            // 1. 如果 Slot 里已有 Entity B，把 Entity B 踢回暂存区
            if (slot1.hasItem) { ... }
            
            // 2. 把 Entity A 的坐标更新为 Slot 1 的坐标
            registry.addComponent(entityA, 'Transform', { ...slot1.transform });
            
            // 3. 更新 Entity A 的 Layout 数据
            registry.addComponent(entityA, 'Layout', { parent: 'Slot_1', ... });
        });
        ```

### Phase 4: 响应 (Reactivity)

**场景**: 界面刷新。

1.  **Registry**: 
    *   检测到 `Transform` 和 `Layout` 组件变了。
    *   触发依赖更新 (Vue Reactivity System)。

2.  **View 层 (`StandardGridView.vue`)**:
    *   `const slots = computed(() => registry.query(...))` 重新计算。
    *   Vue 的 Virtual DOM diff 发现 Entity A 的坐标变了。
    *   DOM 节点样式更新 `style="transform: translate(...)"`。
    *   用户看到卡片“吸附”到了格子里。

---

## 3. 常见问题 (FAQ)

### Q1: 我能直接在 `View` 如 `handleSlotClick` 里修改数据吗？
**答案**: 
*   **可以**: 如果逻辑非常简单且纯展示相关 (如：点击 Toggle `visible`)，可以直接调用 `registry.addComponent`。
*   **不可以**: 如果涉及复杂业务 (如：交换位置、生成网格、甚至涉及网络请求)，请封装成 `System` 或 `Command`，然后在 View 里调用/触发。
*   **原则**: **View 应该尽可能傻**。

### Q2: 为什么我的组件没更新？
**排查清单**:
1.  **Registry 变了吗？**: 在控制台打印 `registry.getComponent(id, Type)` 确认数据确实改了。
2.  **Reactivity 连上了吗？**: 确保你的 View 里用了 `computed` 或 `watch` 包裹查询逻辑。单纯的 `const x = registry.getComponent(...)` 是一次性的，不会自动更新。
3.  **Key 变了吗？**: 确保 `v-for` 循环里的 `:key` 是 `entityId`，而不是 `index`。

### Q3: 怎么调试数据流？
1.  打开 `src/v3/ui/debug/EntityDebugger.vue` (如果有)。
2.  或者在 Console 里手动执行指令，看 System 是否响应。
