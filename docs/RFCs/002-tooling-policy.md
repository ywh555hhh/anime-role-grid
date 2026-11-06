# RFC 002: 工程纪律落地（Prettier + ESLint + 类型检查全覆盖）

- **作者**: Wayne
- **状态**: 已采纳
- **创建日期**: 2026-11-06

## 1. 背景与问题 (Context)

`.agent/rules/code.md` 里写着两条铁律：

1. **严禁 Any 类型** —— 所有类型必须定义在 `shared/types` 或 `src/types/`
2. **原子化样式** —— 必须使用 UnoCSS，禁止在组件内写 scoped CSS

但这两条**只存在于文档里，没有任何工具在 enforcement**。后果是：

| 铁律 | 实际状况 |
|---|---|
| 严禁 Any | 全仓 50 处 `any`（前端 34 / 后端 6 / 脚本 8），散布在 20+ 个文件 |
| 禁止 scoped CSS | 10 个组件带 `<style scoped>`，其中 GridCanvas 与 GridEditor **各抄了一份完全相同的 `hint-cycle` 动画** |

同时还缺三样东西：

- **没有 formatter**。代码风格分裂成四派：`src/logic` 一半单引号无分号（4 空格）、
  一半双引号带分号（3 空格），`.vue` 文件里还有 2 空格和 1 空格两派。
- **后端根本没被类型检查过**。`functions/tsconfig.json` 和
  `workers/snapshot-refresh/tsconfig.json` 一直存在，但**没有任何 npm script 会跑它们** ——
  `vue-tsc -b` 只覆盖 `tsconfig.app.json`（即 `src/`）。后端写错了类型也发现不了。
- **没有 lint**。`.agent/rules` 写的「提交检查清单」第一条是 `npm run type-check` ——
  而这个 script **根本不存在**。

## 2. 目标 (Goals)

- 两条铁律能被机器拦住，而不是靠自觉
- 全仓格式统一，格式化不再产生噪声
- 类型检查覆盖前端 + 后端 + Worker
- 给出「一条命令跑完所有检查」的入口

**Non-goals**：

- 不做 lint 的 stylistic 规则（那是 Prettier 的活，两套工具打架最烦）
- 不追求 100% 规则覆盖 —— 只开 `flat/essential`（正确性子集）
- 不动业务逻辑

## 3. 详细设计 (Detailed Design)

### 3.1 职责切分

```
Prettier  →  格式（引号 / 缩进 / 分号 / 换行）
ESLint    →  正确性（any / scoped CSS / 未使用变量 / 空 catch）
tsc       →  类型
```

**关键决策**：ESLint 只开 `pluginVue.configs['flat/essential']`，不开 stylistic。
否则两套工具会互相打架（"这个引号要不要换"），开发者只能二选一地关规则。

### 3.2 Prettier 配置

`.prettierrc.json`：

| 项 | 值 | 理由 |
|---|---|---|
| `tabWidth` | 4 | `src/logic` 的 .ts 层（22 个文件）主流缩进就是 4 |
| `singleQuote` | false | 与 `imageUrl.ts` / `protoMemory.ts` 等新文件一致 |
| `semi` | true | 同上 |
| `printWidth` | 100 | 现有 .vue 模板的行宽 |
| `vueIndentScriptAndStyle` | false | 现有 .vue 的 `<script>` 内容顶格，保持不变以减少 diff |

`.prettierignore` 排除 `docs/`（Markdown 的表格/换行由人控制）、`public/`、
`src_legacy_backup/`、`legacy_html/`。

### 3.3 ESLint 两条硬规则

**铁律一**：`@typescript-eslint/no-explicit-any: error`

**铁律三**：禁止 `<style scoped>`。

eslint-plugin-vue **没有内置**这条规则（它只有 `vue/no-static-inline-styles`，
管的是 `style="..."` 内联属性，是另一回事）。所以在 `eslint-rules/no-scoped-style.js`
里手写了一条。

规则**走 AST 而不是扫源码文本**：vue-eslint-parser 提供了
`parserServices.getDocumentFragment()`，里面是 SFC 的文档树，
`children` 里依次是 template / script / style 顶层块。

> 为什么不用扫文本：扫文本会被注释里的示例代码误伤。
> 比如有人写一句「以前这里用的是 `<style scoped>`」，规则就报了，纯粹噪音。
> 而 AST 里注释不是节点，不会误报，位置也准。

### 3.4 类型检查全覆盖

```
vue-tsc -b                                → src/（前端）
tsc -p functions/tsconfig.json            → functions/ + shared/（Pages Functions）
tsc -p workers/snapshot-refresh/tsconfig.json → workers/（cron Worker）
```

`functions/tsconfig.json` 补了 `strict` / `noEmit` / `skipLibCheck`。
`noEmit` 是必须的 —— 原来这个 tsconfig 没有它，`tsc -p` 会在 .ts 旁边吐出一堆 .js。

补上之后立刻暴露了 8 个错误（`Env` 少字段、body 是 unknown、zod v4 的
`z.record()` 变成双参数），全部已修。

### 3.5 scoped CSS 的去处

10 处 `<style scoped>` 的内容全部收进 `src/style.css` 的「全局工具类」段：

| 类型 | 去处 | 例子 |
|---|---|---|
| 动画 / keyframes | `src/style.css` | `animate-hint-cycle`、`animate-shake` |
| 隐藏滚动条 | `src/style.css` | `.no-scrollbar` |
| 第三方库产生的 DOM | `src/style.css` | `.ghost-preview`、`.sortable-fallback` |
| 字体 | `src/style.css` | `.font-serif-sc` |
| 弹窗层级 | `src/style.css` + ModalDispatcher 包裹层 | `.modal-dispatcher-root .fixed` |

顺手清掉了两份死代码：`animate-fade-in-up`（定义了但没人用）和
`scrollbar-hide`（同样没人用）。

### 3.6 ModalDispatcher 的包裹层

原来弹窗的「永远在最上层」是这么写的：

```vue
<style scoped>
:deep(.fixed) { z-index: 9999 !important; }
</style>
```

改成：

```vue
<template>
  <div class="modal-dispatcher-root">
    <Transition><component :is="..." /></Transition>
  </div>
</template>
```

```css
.modal-dispatcher-root .fixed { z-index: 9999 !important; }
```

为什么加包裹层而不是写成全局 `.fixed { z-index: 9999 }`：
App.vue 里 `<ModalDispatcher />` 在 `<router-view />` **前面**，
所以同层级 z-index 下调度器渲染的弹窗会落在页面内容下面；
但页面里**内联**渲染的弹窗（搜索框、导出框）不在调度器里，
它们的层级关系应该保持原样。包裹层精确划出了这个边界。

## 4. 替代方案 (Alternatives)

| 方案 | 为什么没选 |
|---|---|
| 只加 Prettier，不加 ESLint | 格式化解决不了 `any` 和 scoped CSS —— 那两条是**正确性**问题，不是格式问题 |
| ESLint 开 `flat/recommended`（含 stylistic） | 和 Prettier 抢活，开发者只能二选一地关规则 |
| 用 `eslint-plugin-vue` 之外的自定义插件包 | 一条规则不值得建包，放仓库内 `eslint-rules/` 即可 |
| 只在 pre-commit hook 里跑 | hook 会被 `--no-verify` 绕开；而且 hook 是**最后一道**防线，前面还得有能手动跑的 script |
| 后端类型检查交给 `wrangler types` | `wrangler types` 生成的是运行时类型声明，不做类型**检查**；而且要求先登录 wrangler，本地/CI 都不方便 |
| 内联 style 保留（`style="font-family: ..."`） | Prettier 会把属性里的引号转义成 `&quot;`，vue-tsc 解析不了 —— **一跑格式化就编译不过**。见下 |

### 内联 style 的坑（实跑发现的）

Prettier 格式化 Vue 模板时，会把 HTML 属性里的双引号转义成 `&quot;`。
项目里 13 处 `style="font-family: 'Noto Serif SC', serif"` 全部中招，
结果 `vue-tsc` 报了一堆 `TS1005: ',' expected`。

解法不是加 `.prettierignore` 绕过，而是**改掉这个写法**：
把字体挪进 `.font-serif-sc` 类。引号只出现在 CSS 文件里，永远不会被转义。
这同时符合项目自己的规范（样式用类表达，不散落在模板内联 style 里）。

## 5. 风险与影响 (Risks & Impact)

### 5.1 验证方式：编译产物 CSS 逐条比对

scoped → global 是**有行为风险**的改动（scoped 会加 `[data-v-xxx]` 属性选择器，
提高特异性）。所以做了逐条比对：

1. `git worktree` 拉出改动前的基线，两边各自 `vite build`
2. 用 postcss 解析两份产物 CSS，**去掉 scope 属性与 scope 哈希后缀**再比对
3. 逐个选择器确认「声明是否等价」

结果：

```
✓ animate-hint-cycle / animate-wobble-slow / animate-shake / animate-scale-in
✓ animate-bounce-in / no-scrollbar / ghost-preview / sortable-ghost
✓ hidden-ghost / sortable-fallback / dock-drag-fallback
```

**并因此发现了一个真实的回归**（详见 5.2）。

### 5.2 发现的真实回归：`animate-bounce-in` 命名冲突

UnoCSS 的 `animate-*` 工具类里本来就有 `animate-bounce-in`（一个上下弹跳的小球），
`EasterEggModal` 用的就是它。而 `VideoSuccessModal` 之前在自己的 scoped style 里
定义了**同名**的 `.animate-bounce-in`，但动画完全不同（缩放淡入）。

以前两者共存：scoped 的那条带 `[data-v-xxx]`，特异性更高，所以 VideoSuccessModal
用缩放淡入，EasterEggModal 用 UnoCSS 的弹跳。

收进全局之后两条规则同特异性 → 后者覆盖前者 → **两个弹窗的动画都变了**，
而且 `@keyframes bounce-in` 这个名字本身也撞了。

**解法**：另起名字。缩放淡入那条改成 `.animate-pop-in` + `@keyframes pop-in`，
UnoCSS 的 `animate-bounce-in` 原样保留给 EasterEggModal。
两边行为都回到改动前。

> 这类「同名不同义」的碰撞，只有真把两份产物摆在一起比对才会暴露出来。

### 5.3 其它影响

- **Breaking**：新增 lint / type-check 规则会让旧代码报错。本 RFC 已把现存问题全部清零，
  所以从这条提交之后开始是干净的。
- **性能**：无。CSS 规则数量基本不变（少了 2 条死代码，多了 3 个工具类）。
- **安全性**：无。

## 6. 实施计划 (Implementation Plan)

- [x] 接入 Prettier + ESLint（扁平配置），写好 `.prettierrc.json` / `.prettierignore`
- [x] 手写 `eslint-rules/no-scoped-style.js`（走 AST，不扫文本）
- [x] 补 npm scripts：`type-check` / `lint` / `lint:fix` / `format` / `format:check` / `check`
- [x] 后端纳入类型检查（`functions/` + `workers/`），修掉暴露出的 8 个类型错误
- [x] 50 处 `any` 全部清零
- [x] 10 处 `<style scoped>` 全部清除，规则收进全局工具类
- [x] 全仓 Prettier 格式化
- [x] 编译产物 CSS 逐条比对，确认 scoped → global 语义等价
- [x] 修掉比对中发现的 `animate-bounce-in` 命名冲突

## 7. 后续

- `src_legacy_backup/` 与 `legacy_html/`（39 个文件、零引用）仍在版本库里，
  建议单独一个提交归档掉
- `docs/v2`、`docs/v3` 两套废弃架构文档也该归档
- 建议加 pre-commit hook（lint-staged）作为最后一道防线，
  但**前提是** CI 里也跑同一套 —— 否则 hook 会被 `--no-verify` 绕开
