# 01. 核心抽象 (Core Abstractions)

## 1. 核心三要素 (The Trinity)

### 1.1 Photo (素材 / 原始图)
*   **定义**: 角色或物体的原始视觉表现。它是不可变的（Immutable）且无状态的。
*   **作用域**: 全局共享（跨所有模板）。
*   **数据结构示例**:
    ```typescript
    interface Photo {
      id: UUID;
      url: string;        // 优化后的 CDN 链接
      originId?: string;  // 例如: Bangumi Subject ID / Character ID
      meta: {
        name: string;
        sourceWork?: string; // 例如: "葬送的芙莉莲"
      };
    }
    ```

### 1.2 Card (卡牌 / 上下文实体)
*   **定义**: 一个**容器**，它持有一个 `Photo` 的引用，并附带了特定玩法的规则数据和运行时状态。
*   **作用域**: 模板实例（特定用户在特定模板下的会话）。
*   **核心哲学**: **组合优于继承 (Composition over Inheritance)**。Card 是组件的集合。
*   **数据结构示例**:
    ```typescript
    interface Card {
      id: UUID;           // 运行时唯一 ID
      photoId: UUID;      // 指向视觉素材
      // 组件 (Components)
      gameData: Record<string, any>; // 模板定义的属性 (例如: { cost: 5, element: 'fire' })
      runtimeState: {
        isObtained: boolean; // 是否已获得
        isLocked: boolean;   // 是否锁定
      };
    }
    ```

### 1.3 Container (容器 / 舞台)
泛指“卡牌存在的地方”，主要分为三类：

*   **Supply Dock (供给池)**: 负责生产卡牌。
*   **Inventory (手牌/暂存区)**: 暂时持有卡牌的地方。连接 Dock 和 Viewport 的缓冲区。
*   **Viewport (画布/视口)**: 最终展示和放置卡牌的结构化区域。

---

## 2. 交互流 (The Interaction)

用户体验由可插拔的 **交互策略 (Flow Strategy)** 定义。

### 2.1 策略模式 (Strategy Pattern)
我们不硬编码交互逻辑，而是使用策略模式。

*   **常见交互策略 (FlowStrategy)**:
    *   `QuickFill` (快速填入): 点击格子 -> 弹出搜索框 -> 选择助手 -> 填入格子。（V1 经典模式）
    *   `StandardGacha` (标准抽卡): Dock 抽卡 -> 进入手牌 (Inventory) -> 用户拖拽到格子。
    *   `StreamerDraft` (主播轮抽): Dock 每次翻开一张 -> 播放揭幕动画 -> 用户放置 -> 循环。

### 2.2 规则引擎 (Rule Engine / 裁判)
所有的交互都受规则约束，而不仅仅是 UI 代码里的 `if/else`。

*   **拓扑规则 (Topology Rules)**: “卡牌 A 不能放在卡牌 B 旁边”。
*   **约束规则 (Constraint Rules)**: “3号位只能放‘辅助’类型的卡牌”。
*   **效果触发 (Effect Triggers)**: “当放置了3张‘火属性’卡牌时，播放火焰特效”。
