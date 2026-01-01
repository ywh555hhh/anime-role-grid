# 📚 Anime Grid V3 Documentation Hub

> **Welcome, Agent.**
> This directory stands as the "Source of Truth" for the V3 Engine Architecture.
> Before writing code, consult the **Standard** and **Guides**.

---

## 🚀 Quick Start (快速上手)

*   **[RFC_009_PLUGIN_DEVELOPMENT_FLOW.md](./RFC_009_PLUGIN_DEVELOPMENT_FLOW.md)**: **(必读)** 开发新功能的标准 SOP。此文档指导你如何从 Data 到 View 构建完整的 Plugin。
*   **[V3_DEV_STANDARD.md](./V3_DEV_STANDARD.md)**: **(必读)** V3 开发的“宪法”。包含“三大定律”和目录结构规范。
*   **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)**: 项目文件结构地图。

---

## 🏛️ Core Architecture (核心架构)

*   **[ARCHITECTURE.md](./ARCHITECTURE.md)**: V3 宏观架构概览。
*   **[ECS_DATA_FLOW_GUIDE.md](./ECS_DATA_FLOW_GUIDE.md)**: **(核心)** 数据流转指南。Input -> System -> Registry -> View 的完整链路解析。
*   **[ECS_COMPONENT_DICTIONARY.md](./ECS_COMPONENT_DICTIONARY.md)**: **(字典)** 核心组件 (`Visual`, `Transform`) 的字段定义手册。

---

## 🗺️ Plans & Guides (计划与指南)

*   **[MIGRATION_PLAN_V1_RESTORATION.md](./MIGRATION_PLAN_V1_RESTORATION.md)**: 复刻 V1 体验的 Roadmap 和 Checklists。
*   **[V3_UX_MIGRATION_GUIDE.md](./V3_UX_MIGRATION_GUIDE.md)**: UX 设计迁移指南。

---

## 📜 RFCs (Request For Comments) - 决策历史

> 这里的文档记录了架构演进的思考过程和决策依据。

*   **[RFC_001](./RFC_001_VSCODE_PLATFORM_ARCHITECTURE.md)**: Platform Architecture (VS Code Like)
*   **[RFC_002](./RFC_002_ECS_DATA_FLOW.md)**: Why ECS? (Data Flow Analysis)
*   **[RFC_003](./RFC_003_FLEXIBLE_WORKBENCH_LAYOUT.md)**: Flexible Workbench Layout
*   **[RFC_004](./RFC_004_SYSTEM_MANAGER.md)**: System Manager Design
*   **[RFC_005](./RFC_005_PLUGIN_PROTOCOL.md)**: Plugin Protocol Definition
*   **[RFC_006](./RFC_006_V1_FEATURE_MATRIX.md)**: V1 Feature Matrix
*   **[RFC_007](./RFC_007_UI_OVERLAY_SYSTEM.md)**: UI Overlay System
*   **[RFC_008](./RFC_008_PRESET_SYSTEM.md)**: Preset System
*   **[RFC_009](./RFC_009_PLUGIN_DEVELOPMENT_FLOW.md)**: Plugin Dev Flow (Also listed in Quick Start)

---

## 📦 Archive (归档)

> ./archive/

包含已过时或被取代的文档：
- `ECS_DEEP_DIVE.md` (Replaced by Data Flow Guide)
- `PLUGIN_SYSTEM_DEV_GUIDE.md` (Replaced by RFC 009)
- `V3_DEVELOPER_HANDBOOK.md` (Replaced by Standard & RFC 009)
- `ECS_STATUS_REPORT.md`
- `TECH_DEBT_AUDIT.md`
- `V1_DEEP_DIVE_ANALYSIS.md`
