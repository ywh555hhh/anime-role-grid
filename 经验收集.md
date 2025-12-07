# 经验收集 (Lessons Learned)

## 📌 后端代理路由硬编码问题 (2025-12-07)

**问题描述**:
在上线新的 ACG 多分类搜索功能后，发现虽然前端 UI 上选择了“动画”、“游戏”或“小说”，但搜索结果始终只返回“角色”相关的数据（例如搜“芙莉莲”只出角色，不出动画条目）。

**根本原因 (Root Cause)**:
Cloudflare Functions 的后端代理文件 (`functions/api/search.ts`) 中，`fetch` 的上游地址被**硬编码**为 `https://api.bgm.tv/v0/search/characters`。
虽然前端负责逻辑的 `useBgmSearch` 能够区分类型，但它发给后端的请求只包含了 `keyword` 等通用参数，且后端完全忽略了分类上下文，无脑请求角色接口。

**解决方案**:
1.  **前端改造**: 在 `src/logic/search.ts` 发送请求时，显式增加一个 `searchMode` 字段（`'subject'` 或 `'character'`），明确告知后端意图。
2.  **后端改造**: 在 `functions/api/search.ts` 中解析 `searchMode`，根据该字段动态决定请求 `.../subjects` 还是 `.../characters`。

**避坑指南 (Key Takeaways)**:
1.  **代理层的灵活性**: 写 API Proxy 时（尤其是 serverless function），千万别想当然地写死 URL。如果业务有“分类”概念，代理层必须具备路由分发能力。
2.  **上下文传递**: 前端向代理发送请求时，必须包含所有必要的路由决策信息（如 `type`, `mode`, `category`），不能假设后端“知道”你要搜什么。
3.  **多维度测试**: 功能测试不能只测“默认情况”（比如只测角色搜索正常就上线），必须覆盖所有新增的枚举类型（动画、游戏、小说），确保每个分支都能打通到正确的上游接口。
