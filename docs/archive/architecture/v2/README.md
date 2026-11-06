# V2 文档索引 (Documentation Index)

本目录包含了 **Context Engine (V2)** 重构的基础文档。
V2 的所有开发工作必须严格遵守这些文档中定义的标准。

| 文档 | 描述 |
| :--- | :--- |
| **[01_Core_Abstractions.md](./01_Core_Abstractions.md)** | **核心抽象**：系统的灵魂。定义了 Photo, Card, Container, Flow 等概念。 |
| **[02_System_Architecture.md](./02_System_Architecture.md)** | **系统架构**：技术结构、目录组织以及关注点分离原则。 |
| **[03_UI_UX_Design_System.md](./03_UI_UX_Design_System.md)** | **设计系统**：视觉标准、响应式策略、多语言 (i18n) 以及与 V1 的对齐指南。 |
| **[04_Tech_Stack_Decision.md](./04_Tech_Stack_Decision.md)** | **技术选型**：为什么选择 Drizzle, Zod, Vue-i18n 等技术。 |
| **[05_API_Data_Standards.md](./05_API_Data_Standards.md)** | **API 标准**：API 端点规范、Zod Schema 校验及错误处理机制。 |
| **[06_Photo_Source_Abstractions.md](./06_Photo_Source_Abstractions.md)** | **图片源抽象**：Bangumi, 本地上传及未来扩展源 (Anilist, Pixiv) 的统一接口设计。 |
| **[10_AI_Coding_Standards.md](./10_AI_Coding_Standards.md)** | **AI 开发宪章**：**必须遵守**的前后端代码规范，防止代码劣化。 |
| **[07_Advanced_Features.md](./07_Advanced_Features.md)** | **高级特性**：Party War (党争统计)、Streamer Mode (主播模式) 的 V2 适配方案。 |
| **[08_Monetization_Strategy.md](./08_Monetization_Strategy.md)** | **商业化**：会员分级体系与定制皮肤系统的技术要求。 |
| **[00_Legacy_Pitfalls_and_Guidelines.md](./00_Legacy_Pitfalls_and_Guidelines.md)** | **🔴 避坑指南**：从 V1 继承的血泪教训（数据库、部署、性能）。**必读**。 |

## 开发哲学
1.  **严格类型 (Strict Types)**: 拒绝 `any`。类型定义必须在 `shared/` 目录中前后端共享。
2.  **移动端优先 (Mobile First)**: 为最小屏幕设计核心功能，然后为大屏幕进行增强。
3.  **组合式 (Composition)**: 使用小而美的可复用函数 (Composables) 构建逻辑，拒绝巨型组件。
4.  **国际化先行 (i18n First)**: 所有 UI 文本必须通过 `vue-i18n` 管理，严禁硬编码。
