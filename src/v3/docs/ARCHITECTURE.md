# V3 Engine Architecture

## 1. The Platform Vision (The "VS Code" of Anime Grids) 🌍

**Core Philosophy**: We are building an **Engine**, not just an App.
Just as VS Code provides the shell for infinite languages and debuggers, V3 provides the shell for infinite **Layouts**, **Data Sources**, and **Workflows**.

### The Trinity of Extensibility
The V3 Core (`@core`) defines strict **Interfaces**. Future developers (or modules) simply implement these interfaces to extend capabilities without touching the kernel.

1.  **Source Providers (IProvider)**:
    *   *Analogy*: VS Code File Systems / Language Servers.
    *   *Examples*: `BangumiProvider`, `SteamProvider`, `LocalFileProvider`, `PixivProvider`.
    *   *Role*: Fetch metadata, normalize into `Entity`, supply assets.

2.  **View Plugins (IView)**:
    *   *Analogy*: VS Code Editor / Custom Editors.
    *   *Examples*: `GridView` (Standard), `TierListView`, `PyramidView`, `FlowChartView`.
    *   *Role*: Visualize `Registry` data in a specific geometric arrangement.

3.  **Dock Widgets (IDock)**:
    *   *Analogy*: VS Code Sidebar Panels / Terminal.
    *   *Examples*: `MainGridDock`, `GachaPool`, `Clipboard`, `TrashCan`.
    *   *Role*: Temporary or permanent holding areas for Entities.

---
### Detailed RFCs
- [RFC 001: VSCode Platform Architecture](./RFC_001_VSCODE_PLATFORM_ARCHITECTURE.md)
- [RFC 002: ECS Data Flow](./RFC_002_ECS_DATA_FLOW.md)
- [RFC 003: Flexible Workbench](./RFC_003_FLEXIBLE_WORKBENCH_LAYOUT.md)
- [RFC 004: System Manager & Pipeline](./RFC_004_SYSTEM_MANAGER.md)
- [RFC 005: Plugin Protocol](./RFC_005_PLUGIN_PROTOCOL.md)
---

## 2. 核心流 (Core Flow)

V3 引擎遵循单向数据流架构，深受 ECS (Entity-Component-System) 模式启发但针对 Vue 响应式特性进行了适配。

```mermaid
graph LR
    Input[User Input] -->|Event| Command[Command System]
    Command -->|Mutate| Registry[Registry (Reactive State)]
    Registry -->|React| UI[Vue Components]
    
    subgraph Data Layer
    Registry
    end
    
    subgraph Logic Layer
    Systems -->|Read/Write| Registry
    end
```

1.  **Input**: 用户交互（拖拽、点击）或系统事件。
2.  **Command**: 修改 Registry 的唯一正规途径（支持 Undo/Redo）。
3.  **Registry**: 唯一事实来源 (Single Source of Truth)。底层使用 `shallowReactive` 优化性能。
4.  **UI**: Vue 组件通过 `computed` 自动订阅 Registry 变化，实现高效渲染。

## 2. 序列化策略 (Persistence Strategy)

我们采用“选择性序列化”来保证存档的纯净性。

### 核心原则
*   **Persistent (持久化)**: 必须保存的数据。如 `Transform`, `Visual`。
*   **Transient (临时)**: 运行时产生、不需要保存的数据。如 `Interaction` (hover, dragging), `Cache`。

在 `Registry.serialize()` 中，我们维护了一个黑名单 (`TRANSIENT_COMPONENTS`)，只有非黑名单组件会被输出到 JSON。

```typescript
// 示例：Interaction 组件不会被保存
const TRANSIENT_COMPONENTS = new Set(['Interaction']);
```

这确保了 loadTemplate 后，世界是“静止”且干净的，不会出现加载后卡片仍处于“拖拽中”的诡异状态。

## 3. 层级管理 (Layer Strategy)

为了解决复杂的遮挡问题，我们定义了全局 Z-Index 常量 (`LAYERS`). 任何涉及层级的组件或 CSS 都**必须**引用此常量。

| Layer Name | Z-Index | Description |
| :--- | :--- | :--- |
| `BACKGROUND` | 0 | 背景装饰、网格底板 |
| `SLOT` | 10 | 插槽区域 (必须高于背景) |
| `CARD_IDLE` | 20 | 静止的卡片 |
| `CARD_HOVER` | 30 | 鼠标悬停时的卡片 |
| `CARD_DRAGGING` | 100 | 正在拖拽的卡片 (最高优先级) |
| `UI_OVERLAY` | 200 | 全局 UI (右键菜单、Toast) |

### 实现方式
在 `EntityCard.vue` 中，我们动态计算 z-index：
```typescript
zIndex: isDragging.value ? LAYERS.CARD_DRAGGING : (z || LAYERS.CARD_IDLE)
```

## 4. 事件总线 (Event Bus)

为了解耦系统（如 `DragSystem` 不需要知道 `AudioSystem` 的存在），我们引入了类型安全的 Event Bus。

*   **`entity:snapped`**: 实体吸附时触发。
*   **`entity:swapped`**: 实体交换时触发。
*   **`template:loaded`**: 模板加载完成时触发。

监听示例：
```typescript
EventBus.on('entity:snapped', ({ entityId }) => {
    AudioSystem.play('click');
});
```
