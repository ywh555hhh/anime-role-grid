# V3 Engine Development Standards & Agent Guidelines

> **Status**: Living Document
> **Authority**: High (Overrides generic coding rules for V3 directory)

为了实现 "多模式 + 插件化 + UGC" 的宏大愿景，所有参与 V3 开发的 Agent (包括 Cursor, Windsurf, Copilot 等) 必须严格遵守以下规范。

---

## 1. 核心架构三原则 (The Three Laws of V3 ECS)

### Law 1: Data / Logic Separation (数据逻辑绝对分离)
*   **严禁** 在 Component 中写方法 (Method)。Component 必须是纯 JSON 数据结构 (Interface)。
*   **严禁** 在 System 中存储状态 (State)。System 必须是无状态的逻辑函数，所有状态必须存放在 `Registry` 中。
    *   *Bad*: `class MySystem { private doubleClickTimer = 0; }`
    *   *Good*: `registry.addComponent(entity, 'Timer', { value: 0 })`

### Law 2: Reactive Native (原生响应式)
*   **严禁** 手动 DOM 操作。V3 的渲染层完全依赖 Vue 3 的 `computed` 和 `watch` 对 `Registry` 的自动响应。
*   **严禁** "每帧同步 UI"。不要尝试写一个 `updateLoop` 去 `forceUpdate()` 组件。相信 Vue 的响应式系统。

### Law 3: Command Pattern (命令模式)
*   **严禁** 直接修改 `registry.components`。
*   **必须** 通过 `Command` (如 `MoveEntityCommand`, `SetComponentCommand`) 来改变世界状态。
    *   *Reason*: 只有这样才能实现 "时间旅行" (Undo/Redo) 和 "多人协作" (CRDT/Multiplayer)。

---

## 2. 目录结构规范 (Directory Structure)

我们将项目划分为**内核**与**生态**。

```text
src/v3/
├── core/               # [内核] 严禁业务逻辑入侵
│   ├── ecs/            # Registry, Types, Command
│   ├── standard/       # 核心组件定义 (Transform, Visual, Meta)
│   └── utils/
├── systems/            # [逻辑] 核心系统实现
│   ├── layout/         # 排版系统
│   └── interaction/    # 拖拽系统
├── platform/           # [平台] 插件宿主环境
│   ├── api/            # 暴露给插件的 API (Sandbox)
│   └── managers/       # SystemManager, PluginManager
├── plugins/            # [生态] 所有的业务逻辑都在这里！
│   ├── builtin/        # 内置插件
│   │   ├── grid-view/  # 标准九宫格视图
│   │   ├── dock-view/  # 标准 Dock
│   │   └── budget/     # (Proposed) 预算限制系统
│   └── community/      # (Future) 第三方插件
└── ui/                 # [渲染] 只有 Vue 组件，没有逻辑
    ├── workbench/      # 布局壳子
    └── renderer/       # 负责把 Entities 画出来
```

---

## 3. Agent 开发行为准则 (Agent Behavior Guidelines)

当你 (AI) 接到任务时，请按以下流程思考：

### 3.1 这个功能是 "Core" 还是 "Plugin"？
*   **Core**: 涉及到底层数据结构变化、渲染管线变更。 (慎重，需 RFC)
*   **Plugin**: 新的玩法（如“选战队”）、新的视图（如“金字塔”）、新的限制（如“只能填3个”）。 (随意，鼓励新建 Plugin)

**Case Study**:
> User: "我想做一个功能，角色死了以后变黑白。"
>
> *   **Wrong Approach**: 修改 `VisualComponent`，增加 `isDead` 字段。修改 `Renderer`，如果 `isDead` 就加滤镜。
> *   **V3 Approach**: 
>     1. 创建 `DeathPlugin`。
>     2. 定义 `DeadComponent` (Tag)。
>     3. 创建 `DeathRenderSystem`: 监听带有 `Dead` 标签的实体，把它的 `Visual.styleVariant` 改为 `grayscale`。

### 3.2 必须维护的文档 (Documentation Manifest)
在提交代码前，必须检查并更新以下文档：

1.  **`src/v3/docs/ECS_DEEP_DIVE.md`**: 如果你修改了 ECS 的核心机制。
2.  **`src/v3/docs/PLUGIN_API.md` (待创建)**: 如果你新增了暴露给插件的接口。
3.  **`task.md`**: 实时更新你的任务进度。

---

## 4. 必要的准备工作 (Preparation Checklist)

为了开始构建，我们需要补全以下基础设施：

### Phase 1: 系统管理 (System Architect)
- [ ] **SystemManager**: 实现系统的注册、注销、优先级排序 (Priority API)。
- [ ] **Pipeline**: 定义 `onSnap`, `onClick` 等生命周期钩子，允许插件拦截。

### Phase 2: 插件协议 (Plugin Protocol)
- [ ] **IPlugin 接口定义**: 一个插件包到底包含什么？(Manifest, Systems, Views)。
- [ ] **Feature Flags**: 如何开关插件 (实现 Mode 切换的基础)。

### Phase 3: 业务迁移 (Migration)
- [ ] **Legacy Logic Porting**: 将 V2 的 Grid/Dock 逻辑重写为 `StandardGridPlugin` 和 `DockPlugin`.

---

**记住：V3 的目标是成为 "Anime Grid 界的 VS Code"。不要写死任何代码，要把能力暴露给插件。**
