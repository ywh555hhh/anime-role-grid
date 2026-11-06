# Next Level Engine V3 - 核心架构需求规格说明书 (Master PRD)

## 0. 愿景 (Vision)

构建一个**通用的、基于 Web 的对象编排与分享引擎**。它不仅仅是一个“填表工具”，而是一个开放的协议，允许开发者定义规则（玩法）、外观（皮肤）和交互（流程），让用户进行创作、游玩并分享。

**架构隐喻：**

* **Core:** 游戏引擎 (Unity/Godot) —— 负责物理法则、时间流逝。
* **Extensions:** 模组 (Mods) —— 负责定义具体玩法（TierList, Gacha, HexMap）。

---

## 1. 核心内核层 (Core Kernel Layer) - "The Engine"

**目标：** 提供高性能、类型安全、支持时间旅行的数据底座。

### 1.1 实体组件系统 (Reactive ECS)

* **REQ-CORE-01 [类型安全注册表]:**
    * 必须使用 TypeScript 高级泛型定义 `World`，实现 `Strict Typing`。
    * `useComponent(id, 'Visual')` 必须自动推导返回类型，杜绝 `any`。


* **REQ-CORE-02 [索引与查询优化]:**
    * 实现**倒排索引 (Inverted Index)**：`Map<ComponentType, Set<EntityId>>`。
    * 查询操作 `query(['Position', 'Selected'])` 复杂度应接近 O(1)，严禁 O(N) 全局遍历。


* **REQ-CORE-03 [事务性状态更新 (Tick/Commit)]:**
    * **Dirty Checking:** 组件更新时标记为 Dirty，仅在 NextTick 触发关联的 System 或 Vue Watcher。
    * **Batch Update:** 支持 `World.batch(() => { ... })`，在回调结束前不触发渲染，避免 DOM 抖动。



### 1.2 时间旅行系统 (Time Travel / History)

* **REQ-CORE-04 [命令模式 (Command Pattern)]:**
    * 所有对 World 的写操作必须封装为 `Command` 对象 (e.g., `MoveCommand`, `SpawnCommand`)。
    * 每个 Command 必须实现 `execute()` 和 `undo()`。


* **REQ-CORE-05 [撤销/重做栈]:**
    * 维护 `HistoryStack`。支持 `Ctrl+Z` (Undo) 和 `Ctrl+Y` (Redo)。
    * 支持“破坏性操作”警告（如：在 Undo 之后进行了新操作，Redo 栈将被清空）。



---

## 2. 表现与换皮层 (Presentation & Skinning Layer) - "The Look"

**目标：** 实现逻辑与样式的彻底分离 (Headless UI)，支持一键换肤。

* **REQ-SKIN-01 [语义化渲染 (Semantic Rendering)]:**
    * UI 组件（Vue组件）不应包含硬编码样式。
    * 组件应消费 `Semantic Props`（如 `variant="ssr"`, `state="disabled"`），而非 CSS 类名。


* **REQ-SKIN-02 [主题注入系统 (Theming System)]:**
    * 支持加载 `Theme Package` (JSON + CSS Variables)。
    * **Renderer Map:** 主题包可定义“用什么组件渲染什么实体”。
    * *例子：* 默认主题用 `<div class="square">` 渲染 Slot；“手绘风”主题用 `<SVGHandDrawnCircle>` 渲染 Slot。



---

## 3. 素材与供给层 (Source & Dock Layer) - "The Input"

**目标：** 统一一切输入源，定义对象如何产生。

* **REQ-SRC-01 [通用适配器 (Universal Adapter)]:**
    * 定义 `rawMaterial` 标准结构。任何输入（本地文件、API数据）经过 Adapter 后都变为相同的 `Entity` + `VisualComponent`。


* **REQ-DOCK-01 [多态供给容器]:**
    * **FlatDock:** 无限滚动的列表（标准素材库）。
    * **DeckDock:** 栈式发牌（点击一次发一张）。
    * **GachaDock:** 消耗资源（Points）生成随机 Entity。
    * **DraftDock:** 临时缓冲区（三选一），未选中的销毁。



---

## 4. 视口与布局层 (Viewport & Layout Layer) - "The Board"

**目标：** 定义对象如何排列，支持复杂的拓扑结构。

* **REQ-VIEW-01 [策略化布局 (Layout Strategy)]:**
    * 系统不硬编码位置，而是根据策略计算 `PositionComponent`。
    * 支持 **Grid** (行列), **Tier** (分层), **Free** (绝对坐标), **Hex** (六边形), **Flex** (流式)。


* **REQ-VIEW-02 [多视口并存]:**
    * World 中可存在多个 Viewport 实体。
    * *场景：* 屏幕左侧是 `TierList Viewport`，右侧是 `TrashBin Viewport`（删除区）。



---

## 5. 交互与流程层 (Flow & Interaction Layer) - "The Feel"

**目标：** 编排用户的操作节奏。

* **REQ-FLOW-01 [交互状态机 (FSM)]:**
    * 定义交互状态：`Idle` -> `Dragging` -> `Hovering(Valid/Invalid)` -> `Dropped`。
    * 支持 **Phantom Preview (虚影)**：拖拽时，目标格子显示半透明的预览效果。


* **REQ-FLOW-02 [模式切换]:**
    * **Edit Mode:** 自由拖拽，无视部分规则。
    * **Play Mode:** 严格执行规则（如：扣除 Cost，触发事件）。



---

## 6. 规则与逻辑层 (Rules & Validation Layer) - "The Brain"

**目标：** 赋予对象行为意义，从“摆图片”变成“玩游戏”。

* **REQ-RULE-01 [钩子系统 (Validation Hooks)]:**
    * `onDragStart`: 检查是否可移动（如：锁定的卡不能动）。
    * `onDragOver`: 检查目标 Slot 是否接受此卡（如：属性匹配）。
    * `onDrop`: 执行放置并结算。


* **REQ-RULE-02 [协同效应 (Synergy System)]:**
    * 被动触发的 System。
    * *逻辑：* 监听 `GridState` 变化 -> 计算积分/Buff -> 更新 `GlobalState` -> UI 展示特效。



---

## 7. 导出与分享层 (Export & Share Layer) - "The Output"

**目标：** 让创作成果可传播，最大化社交价值。

* **REQ-EXP-01 [高保真渲染导出 (DOM-to-Image)]:**
    * 内置截图服务，接管 `Canvas` 或 `DOM` 节点，排除 UI 控件（如按钮、滚动条），只渲染内容区为 PNG/JPG。


* **REQ-EXP-02 [状态压缩 (State Hydration)]:**
    * **Save:** `World -> JSON -> Gzip -> Base64`。
    * **Load:** URL Parameter -> Base64 -> JSON -> `World.restore()`。
    * 实现“零后端分享”：通过超长 URL 直接分享轻量级配置。



---

## 8. 实施路线图 (Implementation Roadmap)

为了避免陷入“过度设计”的泥潭，我们将严格遵循以下 **Milestones**：

### Phase 1: The Tiny Core (核心内核验证)

* **产出：** 无 UI 的纯 TypeScript 库。
* **内容：**
    * `types.ts`: 严谨的类型定义。
    * `registry.ts`: 响应式 ECS World。
    * `command.ts`: 基础的 Undo/Redo 栈。
* **Test:** 单元测试覆盖实体创建、组件增删、历史回滚。



### Phase 2: The Skeleton (最小骨架)

* **产出：** 极简 UI (Debug View)。
* **内容：**
    * 实现 `VisualComponent` 和 `GridSystem`。
    * 在页面上渲染一个 3x3 网格和 5 个方块。
    * 验证 Pinia/Vue 是否能流畅响应数据变化。



### Phase 3: The Flow (交互打通)

* **产出：** 可玩的 Demo。
* **内容：**
    * 接入 `Drag & Drop`。
    * 实现 `MoveCommand`。
    * 验证“拖拽 -> 放置 -> Ctrl+Z 撤销”的全链路。



### Phase 4: The Skin & Rules (皮肤与规则 - 最终形态)

* **产出：** V2 Beta。
* **内容：**
    * 引入图片资源。
    * 实现简单的 Rule (如：同色消除)。
    * 导出图片功能。
