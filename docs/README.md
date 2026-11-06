# 📘 【我推的格子】文档中心

> 看不懂代码时，先看 [INDEX.md](./INDEX.md) 确认你要改的功能属于哪个板块。

## 🚀 核心文档

| 文档 | 什么时候看 |
|---|---|
| [**开发者导航 (INDEX)**](./INDEX.md) | *先看这个*。全貌、业务流图、关键数据流向 |
| [**架构与开发手册**](./Architecture_and_Dev_Guide.md) | 系统架构、目录结构、开发规范、测试策略 |
| [**API 接口文档**](./API_Reference.md) | 后端 HTTP 接口的定义、参数、返回示例 |
| [**数据库设计**](./Database_Schema.md) | D1 各表的字段含义与数据分析模型 |
| [**部署指南**](./Deployment_Guide.md) | 从 GitHub 到 Cloudflare Pages 的完整流程 |
| [**前端架构**](./Frontend_Architecture.md) | 组件拆分与 UnoCSS 样式体系 |
| [**主播模式技术参考**](./Streamer_Mode_Technical_Reference.md) | Dock 系统、拖拽、撤销/重做 |

## 🔴 动手前必读

| 文档 | 内容 |
|---|---|
| [**踩坑清单 (Pitfalls)**](./Pitfalls.md) | 每条都是「错误 → 后果 → 规则 → **现状**」。<br>标 ⏳ 的是**仍待修的欠账**，标 ✅ 的有工具或测试守着 |
| [**项目宪章**](../.agent/rules/code.md) | AI/人类共同遵守的最高法典（铁律、目录隔离、提交检查清单） |
| [**开发规范 (RFC 002)**](./RFCs/002-tooling-policy.md) | Prettier / ESLint 怎么分工，两条硬规则怎么实现的 |

## 🧭 产品与规划

| 文档 | 内容 |
|---|---|
| [PRD：/hangla 分站](./prd-hangla.md) | 第二个小分站的完整需求（**7 项开放决策尚未确认**） |
| [/hangla 原型笔记](./prd-hangla-proto-notes.md) | 原型的实现记录与取舍 |
| [党争/PK 功能设计](./Feature_Design_PartyWar_and_Scope.md) | 未来玩法的设计草稿 |
| [商业化与变现](./Project_Features_and_Monetization.md) | 商业模式与功能规划 |
| [商业架构分析](./Business_Architecture_Analysis.md) | 商业价值与用户增长分析 |
| [模板市场改进 (TODO)](./TODO_模板市场改进.md) | 待办清单 |
| [未来计划 1](./未来计划1.md) | 早期规划草稿 |

## 🧪 规格与杂项

| 文档 | 内容 |
|---|---|
| [功能规格 (specs/)](./specs/) | 主播模式 / 官方模式 / UG 模式 / 创作者模式 的交互规格 |
| [system_context](./system_context.md) | 系统上下文速览 |
| [探针假阳性复盘](./lens-false-positives.md) | 为什么 `tsc` 会对 `.vue` 报假阳性（附可复现实验） |
| [Agent Guidelines](./Agent_Guidelines.md) | 给 AI 助手的操作规范 |

## 📦 归档

[归档区](./archive/) —— 记录了某些决策的来龙去脉，但**不是现役文档**。
想知道「当初为什么这么定」时去那里翻。

其中两套架构设想（`v2/` 平行主干、`v3/` 通用引擎）最终都没有实现 ——
实际演进方向是**在现有代码上持续加固**，而不是重写。

> ⚠️ 归档不等于废弃。其中 `docs/v2/00_Legacy_Pitfalls_and_Guidelines.md`
> 因为「记录的教训今天仍然有效」，被提升成了现役的 [Pitfalls.md](./Pitfalls.md)。

## 📚 RFC

[RFCs/](./RFCs/) —— 记录**决策过程**的地方：

| RFC | 主题 |
|---|---|
| [000](./RFCs/000-template.md) | 模板 |
| [001](./RFCs/001-modal-dispatcher.md) | 弹窗调度器（优先级队列） |
| [002](./RFCs/002-tooling-policy.md) | 工程纪律落地：Prettier + ESLint + 类型检查全覆盖 |
