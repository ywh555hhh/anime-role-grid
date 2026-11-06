# 03. UI/UX 设计系统

## 1. 目标：兼容 V1，拥抱未来
*   **初始目标**: 默认外观必须与 V1 保持高度一致，避免让老用户感到陌生。
*   **长期目标**: 支持“皮肤 (Skins)”或“主题 (Themes)”系统，允许彻底改变视觉风格。

## 2. 国际化与本地化 (i18n Strategy)
**原则：中文为主，多语言架构先行。**

*   **技术选型**: `vue-i18n` (v9+)。
*   **文件结构**:
    *   `src/v2/locales/zh-CN.json` (源语言)
    *   `src/v2/locales/en-US.json`
    *   `src/v2/locales/ja-JP.json`
*   **开发规范**:
    *   UI 中严禁硬编码中文文本。必须使用 `$t('editor.save_btn')`。
    *   后端 API 返回的错误信息应为**错误码 (Error Code)**，而非直接的文本，由前端根据语言环境渲染对应文案。

## 3. 响应式策略 (Responsive Strategy)

### 3.1 断点设计 (Breakpoints)
*   **移动端 (<640px)**:
    *   **布局**: 单列垂直堆叠。
    *   **Dock**: 底部抽屉 (Bottom Sheet) 滑出。
    *   **网格**: 如果太大则支持平移/缩放 (Zoom Mode)，或一键切换为列表视图 (List Mode) 进行编辑。
*   **平板 (640px - 1024px)**:
    *   **Dock**: 侧边栏 (可折叠)。
*   **桌面端 (>1024px)**:
    *   **布局**: 三栏仪表盘式布局 (左侧工具, 中间网格, 右侧池子)。

### 3.2 移动端优先 (Mobile-First)
V1 的痛点是 5x5 网格在手机上太小。
**V2 解决方案**:
*   **缩放模式**: 允许双指缩放画布。
*   **列表模式**: 一键将网格转换为线性列表，方便手机用户快速填空。

## 4. 视觉一致性 (Visual Consistency)
为了保留项目的“二次元之魂”：
*   **配色**: 保持特定的动漫风格配色（粉色/蓝色强调色）。
*   **字体**: 保持中英日字体栈的统一优化。
*   **微交互**: 保留并优化点击反馈、成功提示（Toast）的动画效果。

## 5. CSS 架构与防抖动 (CSS Architecture & Stability)

### 5.1 "原子化" 治理 (Atomic Governance)
为了避免 CSS 写乱，我们采取**零手写 CSS** 策略：
*   **UnoCSS 主导**: 99% 的样式必须通过 Utility Class (`flex`, `p-4`, `text-primary`) 实现。
*   **禁止全局污染**: 严禁在 `.vue` 文件中写全局生效的 `<style>`。
*   **Shortcuts**: 对于重复出现的样式组合（如按钮、卡片），**必须** 在 `uno.config.ts` 中提取为 `shortcut`。

### 5.2 布局稳定性 (Layout Stability)
针对“抖动”和“滚动条”问题的终极解决方案：

1.  **Scrollbar Gutter**:
    在全局 CSS 中强制开启：
    ```css
    html {
      scrollbar-gutter: stable; /* 现代浏览器核心方案：预留滚动条位置，防止内容跳动 */
    }
    ```
2.  **Overlay Scrollbars**:
    在 Mac/移动端体验一致，在 Windows 端通过 CSS 伪类自定义滚动条样式，使其不占据布局空间（或与背景融合）。
3.  **容器隔离**:
    *   **App Shell (外壳)**: `100vh` 固定高度，无滚动。
    *   **Main Content (内容)**: `overflow-y: auto`。
    这样只有中间区域滚动，外部框架永远静止，物理上杜绝了整体页面抖动的可能。
