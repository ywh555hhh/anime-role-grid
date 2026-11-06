# 🔴 踩坑清单 (Pitfalls)

> **这份文档是活的。** 每一条都标注了「现状」—— 已解决的记下来当教训，
> 没解决的记下来当欠账。
>
> 它最早是 `docs/v2/00_Legacy_Pitfalls_and_Guidelines.md`，
> 写于 V2 架构设计期间。V2 最终没有实现，但**它列的坑大部分现在还在犯**，
> 所以它不该被归档，而应该被提升为现役文档。
>
> 每条的结构：**错误 → 后果 → 规则 → 现状**。

## 状态图例

| 标记 | 含义 |
|---|---|
| ✅ | 已解决，且有工具或测试在守着 |
| ⏳ | **仍待修**，这是欠账 |
| ⚠️ | 缓解了，但根因还在 |

---

## 一、数据层

### 1. 手写 SQL 字符串拼接

- **错误**：`env.DB.prepare('INSERT INTO ... VALUES (' + var + ')')`
- **后果**：SQL 注入风险；字段类型不安全（TS 不知道 DB 里存了啥）；改表要靠全局搜索
- **规则**：业务代码里不允许出现 SQL 字符串，一律用 Drizzle ORM
- **现状**：⏳ **仍待修**。`functions/api/` 下 9 处裸 `DB.prepare()`，
  Drizzle 只在 `functions/api/v2/` 用了几处。`.agent/rules/code.md` 写着「禁止手写 SQL」，
  但目前没有工具能拦。

### 2. Base64 图片存库

- **错误**：把用户上传图片的 Base64 字符串直接存进 SQLite
- **后果**：D1 迅速膨胀、单条记录巨大、查询极慢，容易触发 Cloudflare 1MB 限制
- **规则**：数据库只存 URL。临时用 Base64 必须后端压缩，且只允许放 Session 临时存储
- **现状**：✅ 已解决。`GridCharacter.image` 已标注 "Deprecated for Base64, use imageId"，
  上传走 `imageId` 指针。

---

## 二、架构与逻辑

### 3. 巨型组件

- **错误**：一个组件同时塞进拖拽逻辑、保存逻辑、Canvas 绘图逻辑、弹窗控制逻辑
- **后果**：改一个按钮的样式，可能顺手把保存功能弄挂；没法测试
- **规则**：组合式函数 + 笨组件。组件只负责布局，逻辑抽到 `logic/` 或 composable
- **现状**：⏳ **仍待修**。`GridEditor.vue` 731 行、`Search.vue` 1003 行、
  `HanglaProto.vue` 1670 行。
  `GridEditor` 已经做对了一半（它是编排层，逻辑在 `logic/`），
  但 `Search.vue`（搜索 + 裁剪 + 上传 + 热榜全塞在一起）和
  `HanglaProto.vue`（整套原型）还是巨型组件。

### 4. 业务逻辑与 UI 耦合

- **错误**：彩蛋触发逻辑直接写在「导出成功弹窗」的代码里
- **后果**：想在别的地方（比如保存时）触发彩蛋，就得把代码复制一遍
- **规则**：UI 只负责抛出事件，规则由独立的规则引擎监听
- **现状**：⏳ **仍待修**。`matchEasterEgg` 仍在 `GridEditor.vue` 的保存流程里直接调用。
  （弹窗调度本身已经做对了 —— `modalStore` 的优先级队列，
  见 `src/stores/modalStore.ts`。）

---

## 三、状态管理

### 5. Prop Drilling 与事件总线混乱

- **错误**：为了让深层组件通知顶层，用混乱的 `emit` 链或全局事件总线
- **后果**：数据流向不可追踪
- **规则**：全局状态进 Pinia，局部状态用 props / emits
- **现状**：✅ 已解决。`gridStore`（唯一状态源）+ `modalStore`（弹窗调度）。

### 6. 每次响应式更新都重算整个布局

- **错误**：每次状态变化都重新计算整个网格的布局
- **规则**：用 `computed` 的缓存特性；监控性能瓶颈
- **现状**：✅ 已解决。布局计算全部走 `computed`。

---

## 四、工程纪律（2026-11 新增）

这一节是 `codex/architecture-cleanup` 那轮重构里踩出来的。
它们有个共同点：**每一条以前都只是「文档里的一句话」，所以一直有人再犯。**

### 7. 注释不是编译器

- **错误**：两份文件各写一份「必须保持一致」的常量，靠注释互相提醒
- **后果**：迟早漂移。漂移了没人知道，因为「注释说了要对齐」
- **规则**：需要对齐的东西，要么合并成一个真相源，要么用测试钉死
- **现状**：✅ 已解决。
  - 像素规格 → `src/logic/constants/pixelSpec.ts`（唯一真相），
    并加了**源码级守卫测试**：谁再写一份 `const CELL_WIDTH =`，测试直接红
  - 模板目录 → `src/logic/templates/` 分类拆分 + 回归测试钉死条数与顺序

### 8. 只写在文档里的规范，等于没有规范

- **错误**：`.agent/rules/code.md` 写着「严禁 Any」「禁止组件内 scoped CSS」，
  但没有任何工具在拦。于是 `any` 50 处、`<style scoped>` 10 处（其中两处动画定义完全重复）
- **规则**：每条规范都要配一个能报错的工具
- **现状**：✅ 已解决。ESLint 两条硬规则 + `npm run check` 一条命令跑完。
  详见 `docs/RFCs/002-tooling-policy.md`。

### 9. 后端没有被类型检查

- **错误**：`functions/tsconfig.json` 一直存在，但**没有任何 npm script 会跑它**。
  `vue-tsc -b` 只覆盖 `src/`。后端写错类型也发现不了
- **后果**：`shared/schema/domain.ts` 在 zod v3 → v4 升级时悄悄坏掉
  （`z.record()` 变成双参数），**因为没人编译过它**
- **规则**：类型检查要覆盖全部产物，前端后端 Worker 都不能漏
- **现状**：✅ 已解决。
  `type-check = vue-tsc -b && tsc -p functions/tsconfig.json && tsc -p workers/snapshot-refresh/tsconfig.json`

### 10. 格式化工具与模板编译器互相打架

- **错误**：模板里写 `style="font-family: 'Noto Serif SC', serif"`
- **后果**：Prettier 会把 HTML 属性里的双引号转义成 `&quot;`，
  而 vue-tsc 解析不了 —— 表现是**「一跑格式化就编译不过」**，
  13 处内联 style 全部中招
- **规则**：样式用类表达，不要散落在模板内联 style 里
- **现状**：✅ 已解决。字体挪进 `.font-serif-sc` / `.font-serif-sc-export` 类。

### 11. scoped CSS 提高特异性 —— 搬成全局会改行为

- **错误**：以为「把 `<style scoped>` 改成全局样式」是纯搬运
- **后果**：scoped 会加 `[data-v-xxx]` 属性选择器，**特异性更高**。
  两条同名规则原来靠特异性共存，合并成全局后后者覆盖前者，行为直接变了
- **实例**：UnoCSS 本来就有 `animate-bounce-in`（弹跳小球），
  `VideoSuccessModal` 的 scoped style 里又定义了一个同名但不同义的
  （缩放淡入）。以前靠 scoped 撑着；收进全局后两个弹窗的动画都变了，
  连 `@keyframes bounce-in` 这个名字本身都撞了
- **规则**：改动样式的作用域，要**逐条比对编译产物**，不能靠眼看
- **现状**：✅ 已解决。做法见 `docs/RFCs/002-tooling-policy.md` §5.1：
  拉基线 worktree，两边各自 build，用 postcss 解析两份 CSS、
  去掉 scope 属性与哈希后缀后逐条比对。就是这个比对抓到了上面的实例。

### 12. 凭据写进仓库 = 公开

- **错误**：把 Bangumi API Token 明文写进 `legacy_html/plan.md`（随上游 fork 一起进来）
- **后果**：仓库是 **public** 的，GitHub 全文可搜。
  这个 Token 从 2025-11-30 起就在公开历史里，
  而它正是 `functions/api/search.ts` 用来调 Bangumi 的那个
- **加剧因素**：`search.ts` 特意把 CORS 收紧到只对自家域回显 Origin，
  理由写得很清楚 —— *「真正的风险是 token 被白用」*。
  但 token 本身就在公开仓库里，收紧 CORS 挡不住
- **规则**：凭据永远不进版本库；`.env` / `.dev.vars` 必须被 gitignore
- **现状**：⏳ **仍待修**。
  - ✅ 文件已从工作区删除（`legacy_html/` 整个移除）
  - ⏳ **但 git 历史里还在**（继承自上游 commit `f26f3b2`），公开可搜
  - ⏳ **且本地 `.env` / `.dev.vars` 用的还是同一个 Token**
  - ⏳ **且生产环境的 Cloudflare Pages 环境变量大概率也是它**
  - **该做的事**：去 Bangumi 申请一个**自己的** Token（<https://next.bgm.tv/demo/access-token>），
    换掉 `.env` / `.dev.vars` / Cloudflare Pages 环境变量，
    并去 Bangumi 后台把旧 Token 作废。
    至于要不要 `git filter-repo` 重写历史抹掉它 —— 那是另一回事，
    会改写所有 commit hash 并断开 fork 关系，需要单独决策。

---

## 五、怎么用这份文档

- **写新代码前**：扫一眼对应章节
- **改完代码后**：如果踩了新的坑，**当场补一条**（连同「现状」）
- **解决了某个坑**：把状态改成 ✅ 并写清是怎么解决的（最好是"有工具/测试在守着"）
- **状态是 ⏳ 的**：那就是欠账。欠账要么排期，要么明确写下「为什么现在不做」
