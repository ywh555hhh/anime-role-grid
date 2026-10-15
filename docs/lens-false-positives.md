# 静态检查的已知假阳性（含证据与「不要这样修」）

> 这份文档是为了**不必每轮重新论证**。每条都附了可复现的实验。

---

## 1. `lens` 报 `Cannot find module '~/pages/Xxx.vue'`

**触发**：`src/router/index.ts` 里 `component: () => import('~/pages/HanglaProto.vue')`
（以及任何本轮被改动过的同类 import 行）

**原始报错**：

```text
Cannot find module '~/pages/HanglaProto.vue' or its corresponding type declarations.
                                             ↑
```

### 为什么是假阳性

注意报错后半句 `or its corresponding type declarations` —— TS 说的是
「我不认识 `.vue` 这个扩展名」，而不是「这个文件不存在」。

- 该探针是**纯 tsc 系**：它会用 `tsconfig.app.json` 的 `paths`（所以 `~/*` 能解析），
  但**没有 vue 插件**，因此解析不了 `.vue` 单文件组件。
- 项目实际用的 `vue-tsc` 原生支持 `.vue`，所以真实检查一直是干净的。
- 本仓库 5 条路由 import 写法**完全一致**（`~/pages/*.vue`），
  探针只报「本轮改动过的那一行」——这也说明它不是针对某个文件的真实问题。

### 证据

```bash
npx vue-tsc -b --force     # → 0 错误
npm run build              # → dist/assets/HanglaProto-*.js 正常产出
```

线上 `/hangla` 也实测正常渲染 5 个层级行。

### ⚠️ 不要用 `declare module '*.vue'` 去消它

那是网上/模板里最常见的写法，但**在本仓库是有害的**：`*` 会匹配**任何** `.vue` 路径，
于是 `.vue` 的路径校验被全局关掉，打错的组件名、放错的目录都会被静默吞掉。

**实验（务必自己跑一遍）** —— 先故意 import 一个不存在的组件：

```ts
// src/__typo_probe.ts
import Missing from '~/pages/ThisFileDoesNotExist.vue'
export const probe = Missing
```

然后：

| 条件 | `npx vue-tsc -b --force` 结果 |
| --- | --- |
| 有 `declare module '*.vue'` | **0 错误** ❌ 错误被吞掉了 |
| 没有它 | `error TS2307: Cannot find module '~/pages/ThisFileDoesNotExist.vue'` ✅ 正确报错 |

结论：那条通配声明会用「全局不再校验 `.vue` 路径」换取「让不会解析 `.vue` 的探针闭嘴」，
是拿真实安全性换表面安静。

---

## 2. 补充（2026-10-15）：为什么项目里怎么改都消不掉这个 blocker

进一步实验后把这个探针的行为搞清楚了 —— **它结构性无法被满足**。

### 2.1 改成正解：逐个精确声明

`src/vue-components.d.ts` 里逐个声明**真实存在**的页面组件，好处是：

- 纯 tsc 系工具（编辑器、静态检查）能解析它们
- **打错的路径依然报 TS2307**（`*` 通配做不到这一点）
- `.d.ts` 是纯类型文件，对构建产物零影响

实测：用主动 LSP 探针检查 `src/router/index.ts`

```
lens_diagnostics  source=lsp  scope=paths  mode=full
  → 无模块解析报错（只剩若干关于 Record<string, unknown> 的 hint）
```

**真实 LSP 已经干净了。**

### 2.2 但每轮的 blocker 依然照报

原因是那个 blocker 走的是**逐文件孤立编译**：它既不加载项目的 `.d.ts`，
也不加载 vue 插件。所以**任何项目内的声明都不可能被它看到** ——
这也解释了更早一次「补 `src/env.d.ts` shim 未能消除」的现象：
那次不是写法问题，而是它根本看不到那个文件。

### 2.3 因此：不要为了消它改代码

判断标准只有一个 —— **`vue-tsc` 的结果**：

```bash
npx vue-tsc -b --force     # 0 错误       → 通过
npm run build              # 正常产出     → 通过
```

真实 LSP 已干净、类型检查完好、构建正常。剩下那个 blocker 是工具能力问题，不是代码问题。

---

## 3. 附：怎么区分「真找不到模块」和「探针不会解析」

看报错文本：

| 报错 | 含义 | 处理 |
| --- | --- | --- |
| `Cannot find module '...' or its corresponding type declarations` | 探针不认这个扩展名 | 假阳性，忽略（见本文） |
| `Cannot find module '...'`（没有后半句），或 `vue-tsc` 自己也报 | 真问题 | 检查文件是否存在、大小写、`tsconfig.app.json` 的 `include` |

本仓库的 alias 定义在 `tsconfig.app.json`：

```json
"baseUrl": ".",
"paths": { "~/*": ["src/*"] }
```
