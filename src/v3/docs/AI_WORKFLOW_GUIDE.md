# AI Agent 协作与开发闭环指南 (AI Workflow Guide)

> **目标**: 建立一套标准化的“人机协作 SOP”，确保 AI 写出的代码符合 V3 架构，并且每次开发都有始有终，能够沉淀为文档。

---

## 🛑 0. 架构红线 (Architectural Red Lines)

在写任何代码之前，必须先通过**“四多检测”** (RFC 013/014)。如果不符合以下规定，**拒绝执行**。

1.  **NO Global Singletons**: 严禁创建全局唯一的业务状态（如 `activeCell`）。所有状态必须依附于 `ViewContext` 或 `Store`。
2.  **NO Untyped Sources**: 严禁允许 `any` 类型的数据流入系统。Source 必须通过 Zod Schema 校验。
3.  **NO Zombie Listeners**: 任何 `addEventListener` 或 `setInterval` 必须返回 `IDisposable`，并在组件销毁时调用。
4.  **NO Hardcoded Layouts**: 严禁在 Vue 组件里写死侧边栏。必须通过 `DockService` 动态注册。

---

## 🔁 开发逻辑闭环 (The Loop)

一个完整的 AI 开发任务必须经历以下 5 个阶段：

```mermaid
graph TD
    A[1. 定义 (Define)] --> B[2. 计划 (Plan)]
    B --> C[3. 执行 (Execute)]
    C --> D[4. 验证 (Verify)]
    D --> E[5. 收尾 (Finalize)]
    E --> A
```

---

## 1. 定义阶段 (Define) - "怎么让 AI 听懂"

不要只说“我要个新功能”，要用**架构师**的口吻下达指令。

*   **Bad Prompt**: "帮我做一个排行榜功能。"
*   **Good Prompt (V3 Style)**:
    > "我要实现一个排行榜功能。
    > 请按照 V3 插件化架构，设计一个 `LeaderboardPlugin`。
    > 它需要包含一个 GridView 用于显示前十名，并且数据来源应该不仅仅是手动输入，还要预留 API 接口。
    > 请先分析目录结构，然后给我一个 Implementation Plan。"

**关键点**:
*   **指定架构**: 明确要求使用 "Plugin"、"ECS System" 或 "Command"。
*   **引用文档**: "请参考 `V3_ARCHITECTURE_MAP.md` 的规范。"

---

## 2. 计划阶段 (Plan) - "谋定而后动"

在 AI 写任何一行代码前，强制要求它生成 `implementation_plan.md`。

**你需要检查什么？**
1.  **四多合规 (Four-Multi Compliance)**: 
    *   **Multi-View**: 状态是否存储在 `ViewContext` 中而不是全局单例？
    *   **Multi-Dock**: 侧边栏是否通过 `DockService` 注册？
    *   **Multi-Source**: 输入数据是否定义了 Zod Schema？
2.  **文件位置**: 新文件是不是放在了 `src/v3/plugins/` 下？(严禁乱放)
3.  **UI/Logic 分离**: 它的 React Component 是不是只负责渲染？逻辑是不是在 System 里？
4.  **数据流**: 是否使用了 Zod 进行输入校验？数据流转是否清晰？

**指令模板**:
> "请创建 `implementation_plan.md`，详细列出你要创建的文件路径、Component 的 Interface 定义，以及 System 的逻辑伪代码。"

---

## 3. 执行阶段 (Execute) - "TDD 与 原子化提交"

让 AI 分步执行，不要这就是最后一次对话。

1.  **先定义契约 (Contracts First)**: 
    *   更新 `src/v3/platform/contracts.ts` (如有必要)。
    *   编写 `schema.ts` 定义 Zod 校验规则。
    *   **Types**: 严禁使用 `any`，必须定义完整的 TypeScript 接口。
2.  **再写核心逻辑**: "现在实现 System 逻辑，并写一个单元测试验证它。"
3.  **最后写 UI**: "逻辑通过了，现在写 Vue 组件来展示它。"
4.  **【强制】自检**: "写完代码不要急着回复。先运行 `vue-tsc -b` 检查类型错误，修复后再汇报。"

**技巧**:
*   **低级错误零容忍**: 漏 tag、漏 import 在 `vue-tsc` 下无处遁形。要求 AI 必须 Passing Type Check 才能交工。
*   **图片对齐铁律**: 所有涉及人物头像/立绘的 `<img />` 标签，必须加上 `object-top` Class，严禁默认居中裁切。
*   **UI/UX 必读**: 编写 UI 组件前，**必须**先阅读 `src/v3/docs/UI_UX_BEST_PRACTICES.md`。

---

## 4. 验证阶段 (Verify) - "眼见为实"

代码写完了，怎么确认能用？

1.  **自动化测试**: 要求 AI 运行测试。
2.  **视觉验证**: 要求 AI 更新 `walkthrough.md`，哪怕是描述它做了什么。
3.  **用户验收**: 你自己在浏览器里点一点。

---

## 5. 收尾阶段 (Finalize) - "文档沉淀" (最重要的一步！)

**代码写完了，如果不更新文档，下一次 AI 就变笨了。**

你应该要求 AI 做三件事：

### A. 更新 `task.md`
*   把当次任务对应的 checklist 打钩 `[x]`。

### B. 生成/更新 `walkthrough.md`
*   记录这次改动长什么样（截图/GIF）。
*   记录这次改动解决了什么问题。

### C. 核心文档回填 (Knowledge Write-back)
如果这次改动涉及到了架构调整或新名词，**必须**同步更新到 `src/v3/docs/` 下的文档。

*   **新增了插件？** -> 更新 `RFC_009_PLUGIN_DEVELOPMENT_FLOW.md` 或 `README.md` 的插件列表。
*   **架构变更？** -> 更新 `V3_ARCHITECTURE_MAP.md`。

**指令模板**:
> "任务完成了。请：
1. 更新 `task.md` 标记完成。
2. 创建 `walkthrough.md` 总结工作。
3. 检查 `src/v3/docs/`，看是否有文档需要更新以反映最新的代码变更。"

---

## 📜 总结：你也要遵守的 CheckList

每次对话结束前，问自己：
- [ ] AI 清楚现在的任务状态了吗？(Task Boundary)
- [ ] 所有的改动都体现在 `task.md` 里了吗？
- [ ] 架构文档是最新的吗？
- [ ] **代码通过 `vue-tsc` 检查了吗？**
