# RFC 001: The "VS Code" Platform Architecture (大豪框架愿景)

> **Status**: Draft
> **Author**: Antigravity (Agent) & User
> **Date**: 2025-12-31

## 1. 核心愿景 (The Vision) 🌍

**"不仅仅是一个拼图软件，而是二次元资产管理的 VS Code。"**

V3 的根本目标是从 "App Builder" (做产品) 转型为 **"Platform Architect" (做平台)**。
我们不再构建一个名为 "Anime Grid" 的应用，我们构建的是一个 **通用图形化资产管理引擎 (The Engine)**。

### 类比 (The Metaphor)

*   **VS Code (The Core)**: 微软只提供了文件系统、编辑器光标核心、命令面板、侧边栏骨架。它不在乎你是写 Python 还是 Java，也不在乎你是在 Debug 还是在写 Markdown。
*   **Extensions (The Plugins)**: 是插件决定了 IDE 的能力。
    *   想画饼图？安装 "Charts" 插件。
    *   想传图片？安装 "Imgur" 插件。

**V3 架构必须彻底重画，以支持这种级别的扩展性。**

---

## 2. 架构分层 (Architecture Layers) 🏗️

### Layer 1: The Kernel (不可变内核)
这是 "死代码" (Deep Foundation)，未来几乎不需要修改。它负责生命周期管理、状态存储和插件加载。

1.  **ECS Registry**: 内存数据库，数据的唯一事实来源。
2.  **Command Service**: 全局指令分发中心 (Undo/Redo, Keybindings)。
3.  **Extension Host**: 插件加载器。负责读取配置，将第三方组件挂载到 Workbench。
4.  **Workbench Shell**: 空骨架 UI (TopBar, SideBar, MainArea, BottomDock)。它不知道内容是什么，只提供 "插槽"。

### Layer 2: The Protocol (协议层 - 核心资产)
这是平台的 "宪法"。所有扩展必须遵守的接口标准 (`interfaces`)。

*   **`IViewProvider` (视图提供者)**:
    *   定义如何在主区域 (Main Area) 渲染数据。
    *   *Examples*: `StandardGridView` (标准格子), `PyramidView` (金字塔), `TierListView` (梯队图), `FreeCanvasView` (自由画布).
    *   *Methods*: `render(context)`, `layout(entities)`.

*   **`ISourceProvider` (数据源提供者)**:
    *   定义如何获取和标准化数据。
    *   *Examples*: `BangumiSource` (API), `SteamSource` (API), `LocalFileSource` (Native), `PixivSource` (API).
    *   *Methods*: `search(query)`, `normalize(data)`.

*   **`IDockProvider` (面板提供者)**:
    *   定义底部或侧边的辅助工具容器。
    *   *Examples*: `GachaDock` (抽卡堆), `ClipboardDock` (暂存区), `TrashDock` (回收站), `PropertiesPanel` (属性栏).

### Layer 3: The Built-in Extensions (实现层)
以前的业务逻辑全部降级为 **"官方内置插件"**。

*   **Extension A: "Core Layouts"**: 包含 `Grid`, `Pyramid` 的默认实现。
*   **Extension B: "Core Sources"**: 包含 `Bangumi`, `Local` 的默认实现。

---

## 3. 实施路径 (Implementation Path) 🛣️

我们现在的首要任务不是 "写界面"，而是 **"定义贡献点 (Contribution Points)"**。

### Step 1: 贡献注册表 (Contribution Registry)

```typescript
// src/v3/platform/contribution.ts

// 1. 视图贡献 (View Contribution)
export interface IViewContribution {
  id: string;          // e.g. 'builtin.views.grid'
  name: string;        // e.g. 'Standard Grid'
  icon: string;
  component: Component; // Vue Component
  checklist?: string[]; // 该视图所需的上下文要求
}

// 2. 面板贡献 (Panel Contribution)
export interface IPanelContribution {
  id: string;          // e.g. 'builtin.panels.assets'
  location: 'sidebar' | 'bottom' | 'float';
  component: Component;
  title: string;
}

// 3. 全局注册中心 (Singleton)
class WorkbenchRegistry {
  private views = new Map<string, IViewContribution>();
  private panels = new Map<string, IPanelContribution>();
  
  registerView(view: IViewContribution) { this.views.set(view.id, view); }
  registerPanel(panel: IPanelContribution) { this.panels.set(panel.id, panel); }
  
  getViews() { return Array.from(this.views.values()); }
}
```

### Step 2: 工作台重构 (Workbench Refactor)

主界面将变得极度抽象，完全由配置驱动：

```vue
<!-- MainViewport.vue -->
<template>
  <div class="workbench-shell">
    <!-- Top Configuration Bar -->
    <TitleBar /> 
    
    <!-- Dynamic Main Area (The Editor) -->
    <div class="editor-container">
      <!-- 动态加载当前选中的 View 插件 -->
      <KeepAlive>
        <component :is="activeView.component" />
      </KeepAlive>
    </div>

    <!-- Dynamic Dock Area (The Terminal/Panel) -->
    <div class="dock-container">
      <div v-for="panel in activePanels" :key="panel.id" class="dock-widget">
         <component :is="panel.component" />
      </div>
    </div>
  </div>
</template>
```

---

## 4. 优势总结 (Why this rules) 🏆

1.  **无限扩展 (Infinite Scale)**: 用户想要个 "视频时间轴"？或是 "文字云"？不需要改核心代码，写个 plugin 注册进去即可。
2.  **开放生态 (Open Logic)**: `WorkbenchRegistry` 可以暴露给 window 对象，允许第三方脚本在运行时注入新的 UI。
3.  **极简维护 (Clean Core)**: 核心团队只维护 "加载器" 和 "接口定义"，业务逻辑的复杂性被分散到了各个插件中。

**结论**: 暂停所有具体的 Grid UI 开发，优先搭建 **Extension Host** 和 **Contribution Registry**。
