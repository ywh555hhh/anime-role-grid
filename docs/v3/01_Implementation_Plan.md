# V3 Phase 1: The Tiny Core (核心内核) 实施计划

## 目标 (Goal)
构建一个**无 UI、高内聚、类型安全**的 ECS 引擎核心。这将作为 V3 的物理法则层，负责数据的存储、查询和状态回滚。

## 0. 设计原则 (Design Principles)
- **Zero `any` Policy**: 全局严禁显式或隐式的 `any`。所有泛型必须可推导。
- **Store Separation**: 数据 (State) 与逻辑 (Logic) 彻底分离。State 为 POJO/Map，Logic 为 Function/Class。
- **Mutation Control**: 只有 `Command` 和 `Registry` 允许修改 State。外部视图只能 Read。

## 1. 核心模块 (Core Modules)

### 1.1 类型契约 (`src/v3/core/ecs/types.ts`)
> Status: **Confirmed**
- 定义 `EntityId` (Branded String).
- 定义 `CoreComponentMap` (Meta, Transform, Visual, LayoutConfig, Interaction).
- 定义 `WorldState` (SoA 结构).
- 定义 `IRegistry`, `ICommand` 接口.

### 1.2 注册表实现 (`src/v3/core/ecs/registry.ts`)
> Status: **Pending**
- **Class**: `Registry implements IRegistry`
- **State**: 使用 `reactive` (Vue) 或 `shallowReactive` 包裹 `WorldState` 也就是 `components` Map，以驱动后续的 UI 更新。
- **Optimization**: 维护 `Map<ComponentType, Map<EntityId, Data>>` 结构。
- **Methods**:
    - `createEntity()`: 生成 UUID，加入 `entities` Set。
    - `addComponent<T>()`: 类型安全的写入 Map。
    - `query(types[])`: (Later Phase) 实现倒排索引查询。

### 1.3 命令系统 (`src/v3/core/ecs/command.ts`)
> Status: **Pending**
- **Class**: `HistoryStack implements IHistoryStack`
- **Logic**: 维护 `past` 和 `future` 两个 Stack。
- **Utils**: `createCommand<T>(name, execute, undo)` 辅助函数。

## 2. 验证计划 (Verification Plan)

由于 Phase 1 没有 UI，我们将编写 **Vitest 单元测试** 来验证核心逻辑。

### 验证场景 (Test Scenarios)
1.  **基础 CRUD**:
    - 创建 Entity -> 确认 ID 存在。
    - 添加 Transform 组件 -> `getComponent` 能取到值。
    - 删除组件 -> 确认值变为 undefined。
2.  **类型安全 (编译期)**:
    - 尝试添加未定义的组件名 -> TS 报错。
    - 尝试读取错误的属性 (如 `Transform.src`) -> TS 报错。
3.  **时间旅行**:
    - Move Entity (x:0 -> x:10) -> Assert x=10.
    - Undo -> Assert x=0.
    - Redo -> Assert x=10.

## 3. 目录结构 (Directory Structure)
```
src/v3/
├── core/
│   ├── ecs/
│   │   ├── types.ts       # 契约
│   │   ├── registry.ts    # 核心逻辑
│   │   └── command.ts     # 时间旅行
│   └── utils/
│       └── id.ts          # UUID 生成
└── tests/
    └── core/
        └── registry.test.ts
```
