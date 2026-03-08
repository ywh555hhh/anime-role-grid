# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

【我推的格子】(Anime Role Grid) - 一个现代化的二次元成分表生成器，基于 Vue 3 + Cloudflare 全栈架构。

## Common Commands

```bash
# 开发
npm run dev              # 启动前端开发服务器 (端口 5173)
npm run dev:full         # 启动完整开发环境 (含 Cloudflare Functions 模拟)

# 构建与测试
npm run build            # 类型检查 + 构建生产版本
npm run test             # 运行 Vitest 测试
npm run preview          # 预览构建结果
```

## Tech Stack

- **Frontend**: Vue 3 (Script Setup) + TypeScript + Vite + UnoCSS
- **State Management**: Pinia + VueUse
- **Backend**: Cloudflare Pages Functions (Edge Worker)
- **Database**: Cloudflare D1 (SQLite at Edge) + Drizzle ORM
- **Image Processing**: Cropper.js (裁切) + Canvas (合成)

## Architecture

### Directory Structure

| Path | Responsibility |
|------|----------------|
| `src/components/` | Vue 组件 (Smart vs Dumb 分离) |
| `src/logic/` | 纯业务逻辑 (导出、模板、搜索) |
| `src/stores/` | 全局状态 (gridStore, modalStore) |
| `src/services/` | API 请求封装 (唯一出口) |
| `src/pages/` | 页面路由 |
| `functions/api/` | 后端 API (运行在 Edge) |
| `shared/` | 共享类型定义 (前后端复用) |

### Key Files

- `src/stores/gridStore.ts` - 核心状态管理，数据持久化到 localStorage
- `src/services/api.ts` - 所有 HTTP 请求的统一出口
- `src/logic/templates.ts` - 模板配置 (无需动数据库，发布即生效)
- `src/logic/export.ts` - 图片生成逻辑
- `uno.config.ts` - UnoCSS 主题配置 (修改品牌色只需改这里)

## Development Rules

### The Golden Rules (来自 .agent/rules/code.md)

1. **严禁 Any 类型**: 所有类型必须定义在 `shared/types` 或 `src/types/`
2. **UI 傻瓜化**: 业务逻辑必须解耦到 Composable/Service，组件只做展示
3. **原子化样式**: 必须使用 UnoCSS，禁止在组件内写 scoped CSS
4. **统一 API 出口**: 所有 fetch 必须封装在 `src/services/api.ts`
5. **零信任输入**: 后端必须用 Zod Schema 验证所有输入
6. **禁止手写 SQL**: 必须使用 Drizzle ORM 构建查询

### Component Structure

```vue
<script setup lang="ts">
// 1. Imports (Types -> Utils -> Components)
// 2. Props & Emits
// 3. State (ref/reactive)
// 4. Computed
// 5. Methods / Handlers
// 6. Lifecycle hooks
</script>
<template>
  <!-- 保持语义化 HTML，使用 UnoCSS 类 -->
</template>
```

### Testing Strategy

- **P0 (必测)**: `src/services/api.ts` - Mock fetch 验证 URL 和参数
- **P1 (推荐)**: `src/logic/*.ts` - 纯函数单元测试
- **P2 (选测)**: 复杂 Vue 组件交互测试
- 参考: `src/tests/api.test.ts`

## Database

- Schema 定义: `schema.sql`
- 迁移文件: `migrations/`
- 修改数据库后检查 `functions/api/` 下的 `.bind()` 参数顺序

## Deployment

- 平台: Cloudflare Pages
- 构建命令: `npm run build`
- 输出目录: `dist`
- 后端函数: `functions/` 目录自动部署为 Pages Functions
