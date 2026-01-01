# 04. 技术选型 (Tech Stack Decision)

## 1. 后端：D1 + Drizzle ORM
*   **为什么选 D1?**: Cloudflare 原生支持，免费且无需维护服务器。
*   **为什么选 Drizzle?**:
    *   **极其轻量**: 非常适合 Serverless 环境（低冷启动时间）。
    *   **TypeScript 魔法**: SQL 表结构定义即 TS 类型。重构数据库字段时，代码会自动报错提示，极其安全。
    *   **无运行时开销**: 不同于 Prisma，Drizzle 几乎没有运行时性能损耗。

## 2. API 校验：Zod
*   **理由**: 提供运行时 (Runtime) 和 编译时 (Compile-time) 的双重校验。
*   **用法**: 我们在 `shared/schema` 中定义数据模型。前端自动生成表单校验规则，后端自动拦截非法请求。

## 3. 前端逻辑：VueUse + Pinia + Vue-i18n
*   **VueUse**: 提供大量“无头 (Headless)”浏览器 API（如剪贴板、响应式断点、暗黑模式检测），减少重复造轮子。
*   **Pinia**: Vue 官方推荐的状态管理。V2 的 Store 将更加细粒度化（SessionStore, DockStore, GridStore），避免巨型 Store。
*   **Vue-i18n**: 国际化标准解决方案，支撑未来的多语言扩展。

## 4. CSS：UnoCSS
*   **理由**: 原子化 CSS 引擎，编译产物极小，灵活性极高。
*   **配置**: 如有必要，将创建 V2 专用的 `uno.config.ts` 预设，但在初期尽量复用 V1 配置以保持视觉一致性。

## 5. 构建工具：Vite
*   **理由**: 现有的构建工具，速度极快。其 `import.meta.glob` 功能对于动态加载模板非常有用。
