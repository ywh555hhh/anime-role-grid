# Project V3 Terminology Glossary (术语表)

> **目标**: 统一项目中的专业术语，消除沟通歧义。所有开发文档和代码命名必须严格遵循本表。

---

## 🏗️ 核心架构 (Core Architecture)

### 1. ECS (Entity-Component-System)
V3 引擎的数据驱动内核。

*   **Entity (实体)**:
    *   定义: 一个全球唯一的 ID (UUID)。它本身没有任何属性，只是一个容器的索引。
    *   例如: `e-12345` (代表一个卡片，或者一个格子)。
*   **Component (组件)**:
    *   定义: **纯数据** (JSON Object)。描述 Entity 拥有什么属性。严禁包含方法。
    *   例如: `Transform { x: 0, y: 0 }`, `Visual { src: 'img.png' }`.
*   **System (系统)**:
    *   定义: **纯逻辑**。每一帧或特定事件时运行，查询拥有特定 Component 的 Entity 并修改它们的数据。
    *   例如: `DragSystem` (处理拖拽), `GridSystem` (计算格子位置).

### 2. Platform (平台/宿主)
V3 引擎的操作系统层，负责管理插件和生命周期。

*   **Registry (注册表)**:
    *   **WorkbenchRegistry**: 存储 UI 定义 (Views, Docks, Sources)。
    *   **ECSRegistry**: 存储运行时数据 (Entities, Components)。
*   **Command (命令)**:
    *   定义: 修改 ECS 数据的唯一合法途径。支持 Undo/Redo。
    *   例如: `MoveEntityCommand`, `AddTagCommand`.

---

## 🧩 插件生态 (Plugin Ecosystem)

所有业务功能都必须通过插件实现。

### 1. Plugin (插件)
*   定义: 一个独立的功能包，包含 Views, Systems, Components 的集合。
*   路径: `src/v3/plugins/<plugin-id>/`

### 2. View (视图) - `IView`
*   定义: 工作台**中间**的主画布区域。
*   职责: 可视化 Registry 中的数据。
*   例子: **九宫格 (Standard Grid)**, 金字塔 (Pyramid), 流程图 (Flowchart).

### 3. Dock (停靠栏) - `IDock`
*   定义: 工作台**四周**的侧边面板。
*   职责: 提供工具、素材库、设置项。
*   例子: **素材库 (Assets)**, 属性面板 (Inspector), 回收站 (Trash).中转站

### 4. Source (数据源) - `ISource`
*   定义: 数据的**提供者**。
*   职责: 从外部 (API/File) 获取数据，并将其标准化 (Normalize) 为 ECS Component 数据。
*   例子: Bangumi, Steam, Local File.

### 5. Overlay (覆盖层)
*   定义: 浮在所有内容之上的 UI。
*   职责: 处理临时交互。
*   例子: **Spotlight (全局搜索)**, 右键菜单 (Context Menu), 提示 (Toast).

### 6. Asset Browser (资源浏览器)
*   定义: 连接 `ISource` 与 `IView`/`IDock` 的中间件 UI (通常是一个 Overlay)。
*   职责: 聚合所有 Source，提供统一的搜索/筛选界面，用户选中并将 Entity 注入到目标位置。
*   别名: Picker, Selector, "那个弹窗".

---

## 🏢 业务领域 (Business Domain)

### 1. Grid / Tile (格子)
*   定义: 画布上固定的占位符 (Slot)。通常具有 `GridPosition` 组件。

### 2. Roster / Character (花名册/角色)
*   定义: 用户拥有的、可被拖拽到格子里的实体。

### 3. Template (模板)
*   定义: 保存了特定 Layout 和 Preset 数据的快照 (JSON)。

---

## 🔍 常见混淆辨析 (Disambiguation)

| 术语 | 容易混淆为 | 区别 |
| :--- | :--- | :--- |
| **Grid (网格)** | Table (表格) | Grid 是布局系统 (Layout)，Table 是数据展示。 |
| **Source (源)** | Database (库) | Source 是只读的/外部的 API，Database (Registry) 是内存里的状态。 |
| **Visual (视觉)** | Image (图片) | Visual 是一个 Component，Image 只是资源文件。Visual 还包含样式、滤镜等。 |
