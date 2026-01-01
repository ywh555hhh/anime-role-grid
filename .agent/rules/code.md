---
trigger: always_on
---

# 10. AI 编码与开发宪章 (AI Coding Standards)
> [!WARNING]
> **To All AI Agents / Copilots**:
> 本文档是本项目的唯一最高法典。违反本文档规则的代码变更将被视为无效。
> **Do not guess. Do not assume. Follow the rules.**
## 1. 核心铁律 (The Iron Rules)
1.  **Strict Types Only (严禁 Any)**
    *   ❌ `const data: any = ...`
    *   ✅ `const data: UserProfile = ...`
    *   所有的类型定义必须优先定义在 `shared/types` 中，确保前后端复用。
2.  **No Logic in UI (UI 傻瓜化)**
    *   ❌ 在 `.vue` 模板中写 `v-if="user.role === 'admin' && user.age > 18 && ..."`
    *   ✅ 使用 `const canAccess = computed(() => ...)`。
    *   ❌ 在组件内直接调用 `fetch('/api/...')`。
    *   ✅ 必须调用 `services/` 层封装的方法。
3.  **Atomic CSS or Nothing (原子化样式)**
    *   ❌ `<style scoped> .my-box { margin: 10px; color: red; } </style>`
    *   ✅ `<div class="m-2 text-red">`
    *   如果样式太长，**必须**在 `uno.config.ts` 中定义 `shortcut`，禁止在组件内写“小作文”。
---
## 2. 前端开发规范 (Frontend Standards)
### 2.1 组件结构 (Component Structure)
所有 Vue 组件必须遵循以下顺序：
```vue
<script setup lang="ts">
// 1. Imports (Types -> Utils -> Components)
// 2. Props & Emits (使用 interface 定义)
// 3. State (ref/reactive)
// 4. Computed
// 5. Methods / Handlers
// 6. Lifecycle hooks
</script>
<template>
  <!-- 保持语义化 HTML -->
</template>
```
### 2.2 状态管理 (State Management)
*   **Props**: 必须有详细的 TS 类型定义。
*   **Stores**: 业务状态放入 Pinia。组件内部只保留 UI 临时状态（如 `isHovered`）。
## 3. 后端开发规范 (Backend Standards)
### 3.1 零信任输入 (Zero Trust Input)
*   **原则**: 所有的 `req.body` 或 `req.query` 都是不可信的。
*   **执行**: 必须使用 `Zod` Schema 进行解析 (`.parse()`)。
    ```typescript
    // ❌ 错误
    const { title } = await req.json();
    
    // ✅ 正确
    const body = await req.json();
    const { title } = createSaveSchema.parse(body);
    ```
### 3.2 数据库操作 (Database Ops)
*   **禁止**: 手写 SQL 字符串拼凑。
*   **必须**: 使用 Drizzle ORM 构建查询。
## 4. 架构防腐 (Architecture Integrity)
### 4.1 目录隔离
*   `src/v2` 的代码 **严禁** 引用 `src/logic` (V1) 的代码，除非是明确的 `LegacyAdapter`。
*   `shared` 目录 **严禁** 引用 `src` 或 `functions` 的代码（防止循环依赖）。
### 4.2 避免“幻觉代码”
*   在修改代码前，**先阅读**相关目录下的 `README.md` 或现有代码风格。
*   不要随意发明新的工具函数，先检查 `vueuse` 或 `lodash` 是否已有实现。
## 5. 提交检查清单 (Pre-Commit Checklist)
1.  [ ] `npm run type-check` 通过了吗？
2.  [ ] 没有新增 `any` 吗？
3.  [ ] 新增的样式都用 UnoCSS 解决了吗？
4.  [ ] 所有的业务逻辑都解耦到 Composable/Service 了吗？
