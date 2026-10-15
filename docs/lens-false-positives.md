# 静态检查的已知假阳性（含证据与「不要这样修」）

> 这份文档是为了**不必每轮重新论证**。每条都附了可复现的实验。

---

## 1. `lens` 报 `Cannot find module '~/pages/Xxx.vue'`

**触发**：`src/router/index.ts` 里 `component: () => import('~/pages/HanglaProto.vue')`
（以及任何本轮被改动过的同类 import 行）

**原始报错**：

```
Cannot find module '~/pages/HanglaProto.vue' or its corresponding type declarations.
                                             ↑
```

### 为什么是假阳性

注意报错后半句 `or its corresponding type declarations` —— TS 说的是
「我不认识 `.vue` 这个扩展名」，而不是「这个文件不存在」。

- `lens` 的 LSP 探针是**纯 tsc 系**：加载 `tsconfig.app.json` 的 `paths`（所以 `~/*` 能解析），
  但**没有 vue 插件**，因此解析不了 `.vue` 单文件组件。
- 项目实际用的 `vue-tsc` 原生支持 `.vue`，所以真实检查一直是干净的。
- 本仓库 5 条路由 import 写法**完全一致**（`~/pages/*.vue`），
  探针只报「本轮改动过的那一行」——这也说明它不是针对某个文件的真实问题。

### 证据

```bash
cd <repo>
npx vue-tsc -b --force     # → 0 错误
npm run build              # → dist/assets/HanglaProto-*.js 正常产出
```

线上 `https://oshich…/hangla` 也实测正常渲染 5 个层级行。

### ⚠️ 不要用 `declare module '*.vue'` 去消它

网上/模板里常见的做法是加一个 `src/env.d.ts`：

```ts
declare module '*.vue' { /* ... */ }
```

**在本仓库这是有害的**，实验（可复现）：

```bash
# 先故意 import 一个不存在的组件
cat > src/__typo_probe.ts <<'EOF'
import Missing from '~/pages/ThisFileDoesNotExist.vue'
export const probe = Missing
EOF

# ① 有 src/env.d.ts 时
npx vue-tsc -b --force     # → 0 错误 ❌ 写错的路径被通配声明吞掉了

# ② 删掉 src/env.d.ts 后
npx vue-tsc -b --force     # → error TS2307: Cannot find module '~/pages/ThisFileDoesNotExist.vue'
                           #   ✅ 正确报错
```

结论：那条通配声明会让 **全局不再校验 `.vue` 的路径**（打错组件名/放错目录都发现不了），
用它去换「让不会解析 `.vue` 的探针闭嘴」是拿真实安全性换表面安静。

**正确做法：不动代码，记录在此。** 以 `vue-tsc` 的结果为准。

---

## 2. `vue/src/pages/Xxx.vue` 类报错与 `~/` alias 无关

如果以后真的出现 `Cannot find module`（**不带** `or its corresponding type declarations`，
或者 `vue-tsc` 自己也报），那才是真问题：检查文件是否真实存在、大小写是否正确、
`tsconfig.app.json` 的 `include` 是否覆盖。

本仓库的 alias 定义在 `tsconfig.app.json`：

```json
"baseUrl": ".",
"paths": { "~/*": ["src/*"] }
```
