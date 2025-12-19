# 主播模式 (Streamer Mode) 技术架构与实现细节

> **文档版本**: 1.0
> **最后更新**: 2025-12-19
> **适用版本**: V2.0+

本文档详细记录了“主播模式 / 沉浸模式”的架构设计、组件拆分、状态管理及关键交互实现细节，旨在为后续维护和迭代提供技术参考。

---

## 1. 核心架构设计 (Core Architecture)

### 1.1 设计理念
主播模式旨在提供一个**应用级 (App-like)** 的操作体验，区别于普通网页模式的“文档流”布局。
- **全屏独占**: 移除 Header、Footer、外部滚动条，最大化画布区域。
- **沉浸式交互**: 所有工具浮动或停靠，操作不离开当前视口。
- **直播友好**: 界面简洁，隐藏敏感信息（如登录态），提供明显的 branding 以便于直播露出。

### 1.2 模式切换机制
系统通过 `GridEditor.vue` 中的 `isStreamerMode` 状态（由 `gridStore` 管理）来控制全局渲染逻辑。

```typescript
// src/stores/gridStore.ts
export const useGridStore = createGlobalState(() => {
    // 状态持久化至 localStorage，刷新后保持模式
    const isStreamerMode = useStorage('anime-grid-mode-streamer', false)
    // ...
})
```

- **Normal Mode**: 传统的 Flex 垂直流式布局，用于快速生成图片。
- **Streamer Mode**: `fixed inset-0` 的绝对定位布局，用于复杂排表和录屏。

---

## 2. 界面布局与组件 (UI & Layout)

主播模式的 DOM 结构如下：

```html
<div id="streamer-mode-container" class="fixed inset-0 overflow-hidden ...">
    <!-- 1. 画布区域 (Canvas Area) -->
    <div id="streamer-canvas-area">
        <GridCanvas />
    </div>

    <!-- 2. 悬浮工具栏 (Floating Toolbar) -->
    <div id="streamer-toolbar" class="fixed z-50 ...">...</div>

    <!-- 3. 用量控制 / 教程入口 (Zoom Controls) -->
    <div id="zoom-controls" class="absolute bottom-6 left-6 ...">...</div>

    <!-- 4. 角色卡池 (Dock / Sidebar) -->
    <StreamerDock v-if="isStreamerMode" />
</div>
```

### 2.1 悬浮工具栏 (Toolbar)
- **定位策略**:
    - **Desktop**: 垂直停靠于屏幕**左侧中部** (`Left Center`)，避免遮挡底部画布与右侧 Dock。
    - **Mobile**: 垂直排列于屏幕**右侧底部**，便于拇指操作。
- **功能分组**:
    1.  **历史记录**: 撤销 (Undo) / 重做 (Redo)
    2.  **视图控制**: 显示名字 (Toggle Name) / 全屏 (Fullscreen)
    3.  **文件操作**: 锁定画布 (Lock) / 切换模板 (Grid) / 保存图片 (Image Export)
    4.  **系统**: 收起工具栏 / 退出模式

### 2.2 角色卡池 (Dock)
`StreamerDock.vue` 是主播模式的核心数据交互区。
- **响应式布局**:
    - **Desktop**: 右侧固定宽度的侧边栏 (`w-60`)，包含品牌 Logo、社交链接和双列角色卡片。
    - **Mobile**: 底部抽屉 (`h-48`)，横向双行排列。
- **交互特性**:
    - **拖拽源 (Drag Source)**: 使用 `VueDraggable` 配置 `pull: 'clone'`，允许将角色“克隆”到画布中。
    - **暂存区逻辑**: 未使用的角色暂存在此，刷新不丢失（持久化存储）。
    - **快速删除**: 
        - **Desktop**: 右键点击或拖入垃圾桶。
        - **Mobile**: 长按进入“抖动模式 (Shake Mode)”，点击左上角 X 删除。

---

## 3. 关键交互实现细节 (Key Interactions)

### 3.1 搜索框与滚动锁定 (Search Scroll Lock)
为了解决搜索框弹出时导致的页面抖动问题，采取了**条件锁定策略**。

*   **问题**: 搜索框打开时锁定背景滚动会改变滚动条宽度，导致布局跳动。
*   **解决方案 (`Search.vue`)**:
    *   **Normal Mode**: **不锁定**。允许背景滚动，依靠系统滚动条的常驻来保持布局稳定（无 Jitter）。
    *   **Streamer Mode**: **强制锁定** (`document.body.style.overflow = 'hidden'`)。因为主播模式本身是无滚动的，锁定确保了 App 般的沉浸感。

### 3.2 拖拽体系 (Drag & Drop)
系统使用了 `vue-draggable-plus` (基于 Sortable.js)。
- **跨组件拖拽**:
    - `StreamerDock` (Group: 'grid', Pull: 'clone') -> `GridCanvas` (Group: 'grid', Put: true)。
- **移动端适配**:
    - 强制设置 `forceFallback: true` 以确保在移动端能正确渲染拖拽镜像。
    - 自定义 `fallbackClass` 解决 iOS 下的橡皮筋回弹问题。
    - 特殊处理：拖拽时隐藏卡片上的“删除按钮”，防止误触。

### 3.3 撤销/重做 (Time Travel)
基于 `@vueuse/core` 的 `useRefHistory`。
- **监控对象**: `savedGrids` (整个 grid 数据)。
- **容量**: 20 步。
- **集成**: 工具栏上的 Undo/Redo 按钮直接调用 `history.undo()`。

### 3.4 交互引导 (Onboarding Tour)
使用 `driver.js` 实现分布引导。
- **入口**: 首次进入触发，或点击左下角 `?` 按钮。
- **特殊步骤**: 第一步现在指向“帮助按钮”本身，教会用户如何再次打开教程。
- **对齐**: 步骤 Popover 精确对齐了新版左侧工具栏和右侧 Dock。

---

## 4. 样式与视觉 (Architecture of Style)

### 4.1 响应式断点
- 主要断点为 `md` (768px)。
- **< md**: 移动端布局（Dock 在底，Toolbar 在右，Branding 简化）。
- **>= md**: 桌面端布局（Dock 在右，Toolbar 在左，完整 Branding）。

### 4.2 图标系统
- 统一使用 `i-carbon-*` (UnoCSS Icons)。
- **自定义图标**:
    - **"N" 图标**: 使用衬线体 `font-serif` 渲染的文本 "N"，替代了通用的字体图标，提升辨识度。
    - **社交图标**: 使用内嵌 Inline SVG (QQ / Bilibili / Discord) 以确保 brand color 和细节的准确性。

---

## 5. 已知限制与未来优化

1.  **性能**: 当 Dock 中角色超过 100+ 时，DOM 节点增多可能导致拖拽掉帧。未来可考虑虚拟滚动 (Virtual Scroll)。
2.  **多选操作**: 目前仅支持单选拖拽，未来可支持框选批量操作。
3.  **手势支持**: 移动端目前的画布缩放依赖按钮，未来应支持双指捏合 (Pinch Zoom)。
