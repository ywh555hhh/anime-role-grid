# 07. 高级特性架构 (Advanced Features: Party War & Streamer Mode)

> **Document Purpose**: 将 V1 中验证过的高级特性逻辑迁移并适配到 V2 架构中。
> **Related Docs**: `02_System_Architecture`

## 1. 沉浸式主播模式 (Streamer Mode)

主播模式不仅仅是一个 UI 皮肤，它是与普通文档流截然不同的**应用外壳 (App Shell)**。

### 1.1 架构状态 (State Management)
在 `src/v2/stores/uiStore.ts` (建议) 中管理模式状态：

```typescript
state: {
  mode: 'normal' | 'streamer'
}
```

### 1.2 布局策略 (Layout Strategy)
**不得**使用 CSS Media Query 简单隐藏 Header，必须通过路由 Layout 或根级 `v-if` 彻底切换 DOM 结构。

*   **Normal Layout**: 经典的 Header + Scrollable Content + Footer 结构。
*   **Streamer Layout**:
    *   容器: `fixed inset-0 overflow-hidden` (禁止浏览器级滚动)
    *   工具栏: 悬浮 (Floating) 或 绝对定位 (Absolute)。
    *   交互: 所有的滚动都发生在内部容器 (`GridCanvas` 容器) 中。

### 1.3 核心要求
*   **滚动锁定**: 进入模式时，必须锁定 `body` 滚动。
*   **隐私保护**: 自动隐藏所有 User Info (登录态、UID)。
*   **品牌露出**: UI 中包含显眼的 App Logo (方便直播切片传播)。
*   **OBS 友好**: 配色需考虑高对比度，字体要在 1080p 缩放推流下依然清晰。

---

## 2. 党争统计系统 (Party War / Voting System)

这是一个基于 UGC 数据的全站统计功能。

### 2.1 核心逻辑
当用户保存 Grid 且模版开启了 `voting: true` 时，该次保存被视为一张“选票”。

### 2.2 防刷与反作弊 (Anti-Abuse)
由于 V2 仍然不强制登录，我们沿用 V1 的轻量级防御：
1.  **FP (Fingerprint)**: 浏览器指纹/UUID 存 LocalStorage。
2.  **IP Rate Limit**: 后端限制 `Single IP + UA` 在 1 小时内只能提交 N 次。
3.  **Data Cleaning**: 只有带 `bangumi_id` 的正规数据才计入统计（防止手填 "aaa" 刷榜）。

### 2.3 高性能缓存策略 (The SWR Pattern)
为了保护 D1 数据库不被聚合查询击穿，**必须**实现 "Stale-While-Revalidate" 模式。

**数据库表 (`statistics_cache`)**:
*   `key`: `{template_id}_{period}` (e.g., `2025_genshin_24h`)
*   `data`: JSON String (Top 10 list)
*   `updated_at`: Timestamp

**API 伪代码 (`/api/v2/stats`)**:

```typescript
export async function onRequestGet(context) {
  const { env, request } = context;
  const cacheKey = getCacheKey(request);
  
  // 1. 尝试读缓存
  const cache = await env.DB.prepare('SELECT * FROM statistics_cache WHERE key = ?').bind(cacheKey).first();
  
  const now = Date.now();
  const TTL = 1000 * 60 * 60 * 3; // 3 Hours
  
  // 2. 如果缓存存在
  if (cache) {
    const isStale = (now - cache.updated_at) > TTL;
    
    if (isStale) {
      // 3a. 过期了：返回旧数据，但触发后台更新 (Fire-and-Forget)
      context.waitUntil(updateStatisticsInBackground(env, cacheKey));
    }
    // 3b. 没过期：直接返回
    return Response.json(cache.data);
  }
  
  // 4. 缓存完全不存在 (冷启动)：必须同步等待 (或者返回 Loading 状态)
  const freshness = await updateStatisticsInBackground(env, cacheKey);
  return Response.json(freshness);
}
```

### 2.4 异步更新逻辑 (`context.waitUntil`)
这是 Cloudflare Workers 的杀手级特性。它允许代码在 `return Response` 之后继续运行。利用这一点，我们可以实现**用户端的 0 延迟**体验，同时保证数据的准实时性。
