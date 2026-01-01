# RFC 003: Flexible Workbench Layout System (无限弹性工作台)

> **Status**: Draft
> **Author**: Antigravity (Agent) & User
> **Date**: 2026-01-01

## 1. 核心痛点 (The Problem) ⚠️

当前的 Workbench (`RFC 001`) 采用的是 **"硬编码插槽" (Hardcoded Slots)** 模式：
*   Left: `ActivityBar` + `SidePanel`
*   Top: `TopBar`
*   Center: `MainView`
*   Bottom: `StatusBar` (Fixed)

**这种模式的局限性**：
1.  **无法左右互换**：用户习惯右手鼠标，想把侧边栏放右边？做不到。
2.  **无法多列布局**：我想左边放 "图层"，右边放 "素材"，中间画图？做不到。
3.  **无法自由分割**：我想上下分屏对比两个 Grid？做不到。
4.  **不符合 "Pro" 定位**：专业工具（如 VS Code, Blender, Unity）都允许极其自由的窗口停靠。

---

## 2. 解决方案：箱式模型 (The Box Model) 📦

我们需要抛弃 "Top/Left/Center" 的固定思维，转而采用 **"递归布局树" (Recursive Layout Tree)**。

### 2.1 基础概念 (Primitives)

整个工作台本质上是一个由 **容器 (Container)** 组成的树。

*   **Node (节点)**: 树的基本单元。
    *   Type: `Row` (水平排列) | `Column` (垂直排列) | `Stack` (标签页堆叠) | `Leaf` (具体视图).
*   **Splitter (分割器)**: 节点之间的可拖拽边界。
*   **DropZone (投放区)**: 用户拖拽组件时的高亮吸附区域 (Top/Bottom/Left/Right/Center)。

### 2.2 数据结构 (The Data Structure)

```typescript
type LayoutOrientation = 'horizontal' | 'vertical';

interface LayoutNode {
  id: string;
  type: 'container' | 'component';
  flex?: number; // 伸缩比例
  size?: number; // 像素大小 (用于固定侧边栏)
}

// 容器节点 (Row/Column)
interface LayoutContainer extends LayoutNode {
  type: 'container';
  orientation: LayoutOrientation;
  children: LayoutNode[]; // 递归子节点
}

// 组件节点 (Leaf)
interface LayoutComponent extends LayoutNode {
  type: 'component';
  viewId: string; // 关联的 View ID (e.g., 'grid-editor')
  state?: any;    // 该组件的 UI状态
}
```

### 2.3 默认布局示例 (The Default Tree)

一个标准的 IDE 布局可以描述为：

```json
{
  "root": {
    "type": "container",
    "orientation": "horizontal", // 左右分栏
    "children": [
      {
        "type": "component",
        "viewId": "sidebar.assets",
        "size": 300 // 左侧固定 300px
      },
      {
        "type": "container",
        "orientation": "vertical", // 中间区域 (上下分)
        "flex": 1,
        "children": [
          {
            "type": "component",
            "viewId": "editor.main", // 画布
            "flex": 4
          },
          {
            "type": "component",
            "viewId": "panel.terminal", // 底部面板
            "flex": 1
          }
        ]
      },
      {
        "type": "component",
        "viewId": "sidebar.layers",
        "size": 250 // 右侧图层面板 (新建构想)
      }
    ]
  }
}
```

---

## 3. 交互设计 (Interaction Design) 🖱️

### 3.1 拖拽 (Drag & Drop)
*   **Trigger**: 按住任意 Panel 的 Header (Tab)。
*   **Ghosting**: 拖拽时显示半透明的组件快照。
*   **Snap**: 当鼠标移动到某个 Container 上方时，显示 **"十字吸附区" (Docking Cross)**：
    *   🚫 Center: 添加到当前 Tab 组。
    *   ⬅️ Left: 在左侧切分出新的一列。
    *   ➡️ Right: 在右侧切分出新的一列。
    *   ⬆️ Top / ⬇️ Bottom: 上下切分。

### 3.2 序列化 (Serialization)
*   布局状态 (Layout Tree) 必须自动保存到 `localStorage`。
*   下次打开时，自动恢复用户上次的 "自定义工作台"。

---

## 4. 实施策略 (Strategy) 📅

这是一个较大的重构，不建议一次性推翻现在的 `Workbench.vue`，而是逐步演进：

1.  **Phase A (Current)**: 保持现状 (Left Bar + Fixed Panel)，先跑通 Grid 逻辑。
2.  **Phase B (Smart Dock)**: 引入 `<DockArea location="right" />`，允许简单的左右互换。
3.  **Phase C (Full Engine)**: 引入 `splitpanes` 或手写 Layout Engine，实现完全自由的拖拽。

**建议**: 鉴于我们现在还在 V3 早期，**不要为了做布局引擎而做布局引擎**。我们先手动支持 "Right Sidebar" (右侧属性栏)，等组件多起来了再上全套布局引擎。

**User Decision Required**:
您希望我现在就去实现一个 **Full Layout Engine** (高成本，高回报)，还是先手动加一个 **Right Panel (属性栏)** (低成本，快速见效)？
