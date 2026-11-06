# 02. 系统架构 (System Architecture)

## 1. 概览：平行主干策略 (Parallel Trunk)
V2 与 V1 并存，但**互不共享运行时逻辑**（只共享数据库中的老数据）。
*   **前端**: `src/v2/`
*   **后端**: `functions/api/v2/`
*   **共享层**: `shared/` (唯一的桥梁)

## 2. 目录结构

### 2.1 `shared/` (契约层)
*   `types/`: 纯 TypeScript 接口定义。
*   `schema/`: Zod Schemas（数据校验）。**这是单一事实来源 (Single Source of Truth)。**
    *   前端用它校验表单。
    *   后端用它校验 API 请求。

### 2.2 `src/v2/` (客户端)
采用 **功能优先 + 领域驱动设计 (Feature-First + DDD)**。

```
src/v2/
├── core/                  # 纯领域逻辑 (无 UI)
│   ├── rules/             # 规则引擎
│   ├── models/            # Card, Photo 的类定义
│   └── strategies/        # DockStrategy, FlowStrategy 的实现
├── components/            # 笨组件 (只负责展示)
│   ├── atoms/             # 按钮, 图标
│   └── molecules/         # 卡牌视图, 池子视图
├── features/              # 智能业务功能
│   ├── editor/            # 主编辑器
│   │   ├── EditorLayout.vue
│   │   └── useEditorLogic.ts
│   └── dashboard/
├── stores/                # Pinia 全局状态 (会话, 用户偏好)
├── services/              # API 客户端 (调用 /api/v2)
└── locales/               # i18n 语言包 (zh-CN.json, en-US.json)
```

### 2.3 `functions/api/v2/` (服务端)
标准的 **Controller-Service-Repository** 分层模式。

```
functions/api/v2/
├── [[route]].ts           # 中央路由分发 (Hono 或自定义 Dispatcher)
└── server/
    ├── controllers/       # HTTP 解析, 校验 (Zod)
    ├── services/          # 业务逻辑
    └── db/                # Drizzle ORM
        ├── schema.ts      # 数据库表定义
        └── index.ts       # 连接配置
```

## 3. 数据流 (Data Flow)
1.  **用户操作**: 点击“保存”。
2.  **前端服务**: 调用 `api.post('/save', data)`。
    *   *校验*: 前端 Zod 在发送前检查格式。
3.  **后端控制器**: 接收请求。
    *   *校验*: 后端 Zod 再次检查格式（安全防线）。
4.  **后端服务**: `SaveService.createSave(data)`。
5.  **数据仓储**: 使用 Drizzle 构建 SQL。
6.  **数据库**: D1 执行 SQL。

## 4. 组件通信范式 (Component Communication)
> **原则**: 严禁 Event Bus。严禁 Prop Drilling 超过 2 层。

### 4.1 深层组件 -> 全局 UI (e.g. Toast, Modal)
**✅ 必须使用 Composable (Hooks)**。

*   **场景**: `GridItem` 点击后需要弹窗。
*   **代码**:
    ```typescript
    // src/v2/components/GridItem.vue
    <script setup>
    import { useModal } from '@/v2/composables/useModal'
    
    const { open } = useModal()
    
    function handleClick() {
      // 直接调用，不需要 emit
      open('ItemDetailModal', { id: props.id })
    }
    </script>
    ```

### 4.2 兄弟组件通信
**✅ 使用 Parent State 或 Pinia Store**。
*   如果状态是页面级的（如当前编辑器的 Tool），放 `useEditorStore`。
*   如果状态是纯临时的，在父组件 `EditorLayout` 定义 ref 并传给子组件。
