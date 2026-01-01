# V3 ECS 架构深度解析 (Deep Dive)

你的直觉很敏锐，ECS (Entity-Component-System) 确实是一个需要思维转变的架构。本文档旨在通过具体场景（如“15币选战队” flow）来解释 V3 的数据流动、未来插件化以及规则定义的归属。

## 1. 核心概念回顾 (The "LEGO" Analogy)

在 V3 Engine 中，一切皆为积木。

*   **Entity (实体)**: 仅仅是一个 ID (UUID)。比如 `e-1001`。它本身没有任何属性，就像一个空的乐高底板。
*   **Component (组件)**: 数据积木。
    *   `Visual`: "我是张图片，地址是..."
    *   `Cost`: "我值 5 个金币"
    *   `GridPosition`: "我在网格的 (2,2) 位置"
*   **System (系统)**: 只有逻辑的上帝之手。
    *   `RenderSystem`: "所有的 `Visual` 组件，我把你们画出来。"
    *   `BudgetSystem`: "所有的 `Cost` 组件，我来算算有没有超支。"

## 2. 场景演练 (Scenario Walkthrough)

### 场景 A：简单的“出格子 -> 填格子 -> 分享” Flow

这是一个基础的视觉流，不涉及复杂逻辑。

1.  **出格子 (Initialization)**
    *   用户选择模板。`TemplateLoader` (工具类) 扫描模板配置。
    *   **创建实体**: 创建 9 个 Slot 实体。
    *   **贴标签**: 给每个实体贴上 `LayoutConfig { strategy: 'slot', index: 0...8 }` 和 `Transform` 组件。
    *   **渲染**: `GridSystem` 遍历所有带 `LayoutConfig` 的实体，计算它们的屏幕坐标 (x, y)。

2.  **填格子 (Drag & Drop)**
    *   **开始**: 用户从 Dock 拖动一个角色 (ID: `c-1`)。
    *   **过程**:
        *   `InteractionSystem` 监听鼠标，实时更新 `c-1` 的 `Transform` (跟随鼠标)。
        *   `LayoutSystem.findOccupant()` 每帧检测 `c-1` 是否与某个 Slot (ID: `s-5`) 重叠。
    *   **吸附 (Drop)**:
        *   当用户松手，`InteractionSystem` 发起一个 **Command** (命令): `MoveEntityCommand(c-1, s-5)`。
        *   **Registry (数据库)** 执行命令：
            *   给 `c-1` 加上 `GridPosition { slotId: 's-5' }` 组件。
        *   **事件**: 触发 `EventBus.emit('entity:snapped', { entityId: 'c-1', slotId: 's-5' })`。

3.  **分享 (WebP Export)**
    *   `ExportSystem` 启动。
    *   它调用 `Registry.getSnapshot()` 获取当前世界状态。
    *   **关键**: 它会忽略所有 `Transient` (临时) 组件（比如 "正在被鼠标悬停" 的状态），只获取纯净的数据。
    *   将这堆数据传给 `Renderer` 画出一张静态图。

---

### 场景 B：复杂的“15金币选战队” Flow

这个场景展示了 ECS 处理**业务逻辑** (Business Logic) 的强大之处。

**角色定义**:
*   **出题人**: 定义规则 (Max: 15 Coins) 和 实体属性 (Price)。
*   **答题人**: 拖拽选择，受规则限制。

#### 1. 谁定义属性 (Price)？ -> **Source / Provider**
在 V3 中，数据源 (`IProvider`) 负责生产原始数据。
如果出题人导入了一个 "Faker" 选手，他会在侧边栏设置属性。
*   **操作**: 出题人点击 "Set Cost: 5"。
*   **ECS**: 给实体 `e-faker` 增加一个 `Cost { value: 5 }` 组件。

#### 2. 谁定义规则 (Rule)？ -> **RuleSystem (New)**
V3 目前是通用的，但未来可以开发一个 `BudgetPlugin` (插件)。这个插件会注册一个 `BudgetSystem`。

**BudgetSystem 的逻辑**:
```typescript
class BudgetSystem implements ISystem {
    // 监听吸附事件
    onSnap(entity, slot) {
        const currentTotal = this.calculateTotal(registry);
        const itemCost = entity.getComponent('Cost').value;

        if (currentTotal + itemCost > 15) {
            // ❌ 拦截！规则生效
            UISystem.showToast("你的经费不够了！");
            
            // 撤销该操作 (或者直接禁止吸附)
            return false; 
        }
    }
}
```

#### 3. 完整的 Flow

1.  **出题人配置**:
    *   给 5 个角色分别加上 `Cost` 组件 (5, 4, 3, 2, 1)。
    *   给全局 `GameRules` 实体加上 `BudgetLimit { max: 15 }` 组件。
    *   **分享**: 导出为一个 `.json` 模板文件 (包含了这些 Component 数据)。

2.  **答题人游玩**:
    *   加载 `.json` 模板。ECS 世界恢复 (Entities, Costs, Rules 全部就位)。
    *   **拖拽**: 答题人拖动 "Faker" ($5) 进格子。
    *   **判定**: `BudgetSystem` 计算当前已用 0 + 5 < 15。✅ 允许。
    *   **再拖拽**: 答题人拖动 "Uzi" ($5) 进格子。
    *   **判定**: 当前 5 + 5 < 15。✅ 允许。
    *   ...
    *   **超支**: 试图拖入第四个 $5 选手。
    *   **拦截**: `BudgetSystem` 发现 15 + 5 > 15。❌ 拒绝吸附，卡片弹回原处。

## 3. 插件化与未来 (The Future)

ECS 最强的地方在于**解耦**。

*   **想要添加“羁绊系统”？ (如 TFT)**
    *   **不需要**修改核心代码。
    *   **只需要**写一个 `SynergySystem` (羁绊系统)。
    *   它可以遍历 Grid 里的实体，检查它们的 `Team` 组件。
    *   如果发现 3 个 "IG" 标签的实体，由于它是系统，它可以直接修改 Grid 的样式，或者给角色头上加个特效组件 `VisualEffect { type: 'glow' }`。

*   **想要完全不同的布局？ (如金字塔)**
    *   **不需要**重写拖拽逻辑。
    *   **只需要**写一个 `PyramidView` (视图插件) 和 `PyramidLayoutSystem`。
    *   数据还是那些数据 (Entities)，只是计算位置 `(x, y)` 的公式变了。

## 4. 究极形态：一切皆插件 (The Ultimate Vision)

你完全 `Get` 到了这个架构的终极形态。

### 4.1 互动模板 = 插件堆栈 (Template as a Plugin Stack)

在这里，一个“模板” (Template) 不再只是一张背景图，它是一个 **Configuration File (配置文件)**。

```json
// 15_coins_template.json
{
  "name": "15金币挑战",
  "plugins": [
    "Core_GridSystem",       // 基础网格
    "Core_DragDrop",         // 基础拖拽
    "Plugin_BudgetSystem",   // [插件] 预算限制系统
    "Plugin_LockEdit"        // [插件] 禁止编辑属性系统
  ],
  "entities": [ ... ]        // 预设的角色和格子
}
```
当加载这个模板时，引擎会挂载 `BudgetSystem` 并执行逻辑。这就是“规则即插件”。

### 4.2 区域即插件 (Zones as Plugins)

如果有人提出要一个“复活区” (Graveyard)：
1.  **定义 Component**: `InGraveyard { timeOfDeath: number }`。
2.  **定义 View**: `GraveyardView` (UI 组件)，只渲染带有 `InGraveyard` 组件的实体。
3.  **定义 System**: `ResurrectSystem`，每秒检查 `timeOfDeath`，超时就把 `InGraveyard` 移除，加回 `InGrid`。

**整个项目只有 Entity。** 

## 5. 挑战与回应 (Reality Check: Architect's Feedback)

有“架构师”提出了一些担忧，我们来一一拆解。

### 5.1 挑战一：System 之间的执行顺序 (Execution Order)

> **质疑**: 如果 Rules System 依赖于 Physics System 的结果，顺序错了怎么办？
> **现状**: 目前 V3 是**事件驱动 (Event Driven)** 的，吸附的一瞬间触发 Check。
> **回应**: 这是**Valid Point (合理的担忧)**。
> 当插件变多时（如 10 个插件都想拦截拖拽），仅仅靠 EventBus 是不够的。
> **解决方案 (Roadmap)**:
> 我们需要引入 **`SystemManager`** 和 **`Pipeline` (管道模式)**。
> *   `Pipeline.register('onSnap', [BudgetCheck, SynergyCheck, PhysicsApply])`
> *   给 System 增加 `priority` 权重，权重高的先执行。
> *   *目前代码库中 `ISystem` 接口已经预留了 `priority` 字段，就是为了这一天。*

### 5.2 挑战二：UI 与 ECS 的桥梁 (The UI Bridge)

> **质疑**: ECS 数据变了，怎么通知 React/Vue 更新 UI？不要每帧同步。
> **回应**: 这位架构师可能习惯了 Unity/C++ 的 ECS。
> **我们的优势**: V3 的 ECS 是 **"Reactive Native" (原生响应式)** 的。
> *   `Registry` 底层直接使用了 Vue 3 的 `shallowReactive`。
> *   **UI 不需要“通知”**。当 `Component` 数值变化时，Vue 的 `computed` 会自动追踪依赖并更新 DOM。
> *   我们**没有** "每帧同步" 的开销，因为只有在 Command 修改 Registry 的一瞬间，Vue 的 `computed` 才会响应 (Lazy Evaluation)。

---

## 6. 多模式切换 (Multi-Mode Architect)

> **User Goal**: 实现“主播模式” (干净) 和 “普通模式” (点击上传) 的切换，且共用数据。

**结论**：这个架构不仅能满足，而且**天生就是为了这个设计的**。

### 6.1 模式的定义 (What is a Mode?)

在 V3 架构中，一个 **Mode (模式)** 本质上是两个东西的组合：

1.  **System Preset (系统预设)**: 决定行为。
2.  **Layout Preset (界面预设)**: 决定 UI。

### 6.2 实例：主播模式 vs 普通模式

**数据层 (Registry)**:
*   `e-1 (Grid)`: 始终存在。
*   `e-2 (Card)`: 始终存在。
*   *数据不随模式切换而丢失，它们就在那里。*

| 特性 | 普通模式 (Normal Mode) | 主播模式 (Streamer Mode) |
| :--- | :--- | :--- |
| **Grid 交互** | `ClickToUploadSystem` (点击弹出上传) | `ClickToUploadSystem` **(Disabled)** <br> `DragDropSystem` (Active) |
| **Dock 区域** | `DockView` **(Hidden)** | `DockView` **(Visible)** |
| **UI 布局** | Layout: Standard (Sidebar Left) | Layout: Minimal (Hidden Sidebar) |

### 6.3 代码实现逻辑

我们在 `Workbench` 里可以轻松实现切换：

```typescript
function switchMode(mode: 'NORMAL' | 'STREAMER') {
    if (mode === 'STREAMER') {
        // 1. 调整 UI
        layout.setAreaVisible('dock', true);
        layout.setAreaVisible('sidebar', false);
        
        // 2. 调整逻辑 (Hot-Swap Systems)
        systemManager.unregister('ClickToUpload'); // 禁止点击上传
        systemManager.register('DragDrop');        // 允许拖拽
        
    } else {
        // 恢复普通模式
        layout.setAreaVisible('dock', false);
        layout.setAreaVisible('sidebar', true);
        
        systemManager.register('ClickToUpload');
        systemManager.unregister('DragDrop');
    }
}
```

因为 **Grid (MainView)** 只是一个“渲染器”，它只负责画出 `Registry` 里的东西。
*   当你切换模式时，Grid 不需要刷新，不需要重建。
*   它只是响应的**事件**变了（从点击变为了被拖入）。

**总结**: 你的架构设计完全能满足未来创作者模式、开发者模式的扩展，只需要定义不同的 System 组合即可。

## 7. 阴暗面：ECS 的缺点 (The Dark Side) 🌑

我们必须诚实：ECS 并不是银弹，它也有很明显的缺点，这解释了为什么虽然它性能无敌，但在 Web 前端界（尤其是 React/Vue 圈）并不主流。

1.  **样板代码多 (Boilerplate)**:
    *   在 OOP 里，你给 `Player` 类加个 `hp` 属性只需要一行代码。
    *   在 ECS 里，你需要：1. 定义 `HealthComponent` 接口；2. 注册 Component；3. 编写 `HealthSystem` 来处理扣血逻辑。
    *   **解决**: 我们用 TypeScript 类型推导和 Helper 函数尽量减少了这种痛苦，但比起 OOP 还是繁琐。

2.  **思维反直觉 (Counter-Intuitive)**:
    *   你无法使用 `player.attack(enemy)` 这种符合人类直觉的语法。
    *   你只能 `EventBus.emit('ATTACK', { src: player.id, dst: enemy.id })`，然后由系统去处理。
    *   这对很多习惯了面向对象编程的开发者来说，会有陡峭的学习曲线。

3.  **调试困难 (Debugging)**:
    *   因为逻辑被打散在几十个 System 里，当 `player` 的血量突然归零时，你很难直接找到是那一行代码干的 (Call Stack 不会直接指向凶手)。
    *   **解决**: 必须依赖强大的 `TimeTravel` 调试工具 (我们 V3 的 `Command` 系统就是为了这个)。

## 8. 统计与分享机制 (Customization & Sharing)

### 8.1 统计功能 (Statistics)
**Easier than ever.**
*   因为数据 (Components) 和 视图 (View) 是分离的。
*   我们只需要写一个 `StatisticsSystem`，它甚至不需要渲染任何东西，只需要遍历 Registry：
    ```typescript
    const totalCost = registry.query(['Cost']).reduce((sum, e) => sum + e.cost, 0);
    const ssrCount = registry.query(['Rarity']).filter(e => e.rarity === 'SSR').length;
    ```
*   这比去 DOM 里查 `div` 或者去组件树里翻 `props` 要快一万倍。

### 8.2 短链接分享 (oshigrid.me/t/xyz)

**原理**: ECS Registry 本身就是一张大表，非常容易序列化。

1.  **用户自定义**: 用户拖拽、改名、上传图。本质上修改了 Registry 里的 Components。
2.  **序列化 (Serialization)**:
    *   `registry.serialize()` -> 生成 JSON。
    *   我们使用 "Diff 存储" 或 "全量存储"。对于 15 币模板，大部分数据是不变的，只需要存储**用户修改的部分**（比如 Entity 位置、新上传的 Image URL）。
3.  **编码与存储**:
    *   **Shortcode**: 为了让URL短，我们确实不需要像 BASE64 那么长。
    *   **Flow**:
        1.  Client 发送 JSON 到 Cloudflare D1 / KV。
        2.  Server 生成短码 `xp2s` 对应这个 JSON。
        3.  用户访问 `oshigrid.me/t/xp2s`。
        4.  Server 返回 JSON。
        5.  Client `registry.deserialize(json)` -> **复原现场**。

**关于编码 (Encoding)**:
你提到的 “本质就是一些 on 和 off” 是对的。
*   如果只是标准九宫格，我们甚至不需要 Database。可以直接把数据压缩进 URL：
    *   `oshigrid.me/share?ids=1001,1002,1003&pos=0,1,2`
*   但如果有**自定义上传图片**或**自定义坐标**，数据量会变大，建议还是走 Database + Shortcode 的方案。
