# 00. 🔴 避坑指南 (Legacy Pitfalls & Guidelines)

> [!CAUTION]
> **必读文件**：V1 版本的“血泪教训”总结。V2 开发中如果犯了同样的错误，将是不可接受的。

## 1. 数据库与存储 (Database & Storage)

### 🔴 错误 1：Direct SQL String Injection (手动拼接 SQL)
*   **V1 现状**: `env.DB.prepare('INSERT INTO ... VALUES (' + var + ')')`。
*   **后果**: 极其容易写出 SQL 注入漏洞；极其难以维护；字段类型不安全（TS 不知道 DB 里存了啥）。
*   **🟢 V2 铁律**: **必须使用 Drizzle ORM**。
    *   `db.insert(users).values({...})`
    *   禁止在业务代码中出现任何 SQL 字符串。

### 🔴 错误 2：Base64 Image Bloat (Base64 存库)
*   **V1 现状**: 为了图省事，直接将用户上传图片的 Base64 字符串存入 SQLite。
*   **后果**: D1 数据库迅速膨胀，单条记录体积巨大，查询极慢，且容易触发 Cloudflare 1MB 限制。
*   **🟢 V2 铁律**: **数据库只存 URL**。
    *   图片必须上传到 R2 或其他图床，数据库仅存储 `https://.../image.jpg`。
    *   临时方案（如 V1 迁移）：如果必须存 Base64，必须进行后端压缩，且仅允许在 `Session` 临时存储中使用，严禁持久化。

## 2. 架构与逻辑 (Architecture & Logic)

### 🔴 错误 3：Giant Component (巨型组件)
*   **V1 现状**: `GridEditor.vue` 包含了：拖拽逻辑、数据保存逻辑、Canvas 绘图逻辑、弹窗控制逻辑。洋洋洒洒上千行。
*   **后果**: 改一个按钮的样式，可能不小心把保存功能弄挂了。无法测试。
*   **🟢 V2 铁律**: **组合式函数 (Composables) + 笨组件 (Dumb Components)**。
    *   `Editor.vue` 只负责布局。
    *   逻辑全部抽离到 `useGridSystem.ts`, `useSaveService.ts`。

### 🔴 错误 4：Logic Coupling in UI (业务与UI耦合)
*   **V1 现状**: “彩蛋触发逻辑”直接写在“导出成功弹窗”的代码里。
*   **后果**: 想要在别的地方（比如保存时）触发彩蛋，必须把代码复制粘贴一遍。
*   **🟢 V2 铁律**: **规则引擎 (Rule Engine) 驱动**。
    *   UI 只负责抛出事件 (`emit('save-success')`)。
    *   规则引擎监听事件并决定是否弹出彩蛋。

## 3. 状态管理 (State Management)

### 🔴 错误 5：Prop Drilling & Event Bus Chaos
*   **V1 现状**: 为了让深层组件通知顶层组件，使用了混乱的 `emit` 链或者 `mitt` 全局总线。
*   **后果**: 数据流向不可追踪。
*   **🟢 V2 铁律**: **Pinia Stores + Explicit Props**。
    *   全局状态（如当前模板、用户信息）进 Pinia。
    *   局部状态（如当前格子的 hover 态）用 `props` / `emits`。

## 4. 性能陷阱 (Performance)

### 🔴 错误 6：Recalculating on Every Frame
*   **V1 现状**: 每次 Reactivity 更新都重新计算整个网格的布局。
*   **🟢 V2 铁律**:使用 `computed` 的缓存特性，monitor 性能瓶颈。

---

> **铭记**：V2 的目标不仅仅是重写，而是**工程化**。不要为了“快”而牺牲架构。
