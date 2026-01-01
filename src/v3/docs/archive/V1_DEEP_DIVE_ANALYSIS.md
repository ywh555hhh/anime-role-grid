# V1 版本深度剖析与 V3 迁移指南 (V1 Deep Dive Analysis) 📚

本文档详细拆解了 V1 版本的核心功能实现、设计哲学及用户体验精髓，旨在为 V3 版本的开发提供精确的参考标准。

---

## 1. 核心功能剖析 (Core Features)

### 🔥 全站热榜 (Trending / Heat Map)
**实现文件**: `src/components/Search.vue`, `src/components/TrendingGuideModal.vue`
*   **V1 逻辑**:
    *   **双重入口**:
        1.  `TrendingGuideModal.vue`: 首次进入或点击 "大家都在填什么" 时弹出，展示 **固定推荐** (2025动画/游戏/经典)。
        2.  `Search.vue`: 当搜索框为空时，显示 **动态热榜** (Heat Map)。
    *   **V3 进化 (Multi-Source)**:
        *   不仅仅是 Bangumi。V3 将支持 **多源数据 (Multi-Source)**: Local Images, Zerochan, Pixiv, Steam 等任意 API。
    *   **动态数据**: 通过 `/api/trending` 获取，支持 `12h` / `24h` / `Week` / `All` 四个维度。
    *   **视觉分级**:
        *   **Top 3**: 大图展示，分别带有 金(No.1)、银(No.2)、铜(No.3) 边框和徽章特效。
        *   **Top 4+**: 小图网格展示，紧凑排列，仅显示排名角标。
*   **V3 参考**:
    *   V3 的 "资源库 (Library)" 面板应包含同样的逻辑：默认显示热榜，输入文字后切换为搜索结果。
    *   必须保留 Top 3 的特殊视觉待遇，这是刺激用户点击的关键。

### 🔍 搜索系统 (Search System)
**实现文件**: `src/logic/search.ts`, `src/components/Search.vue`
*   **V1 逻辑**:
    *   **API 代理**: 前端调用 `api.searchBangumi` -> 后端代理 `api.bgm.tv` (解决 CORS 和 Token 问题)。
    *   **智能过滤 (Client-side Filtering)**:
        *   API 返回原始数据后，前端根据 `年份 (Year)` 和 `平台 (Platform)` 进行二次筛选 (例如区分 "漫画" 和 "小说" 同属书籍类型的问题)。
    *   **无限滚动**: 基于 `offset` 的 Load More 机制。
    *   **Debounce**: 输入停止 800ms 后自动触发搜索，体验流畅。
*   **V3 参考**:
    *   V3 应复用 `search.ts` 的核心逻辑，并在 UI 上集成到侧边栏或浮动窗口中。
    *   搜索结果卡片应包含 `Subject Type` (如 TV, OVA, 游戏) 和 `年份` 标签。

### 📤 自定义上传与裁剪 (Upload & Crop)
**实现文件**: `src/components/Search.vue` (集成 `cropperjs`)
*   **V1 逻辑**:
    *   **就地处理**: 上传功能不是单独的页面，而是搜索框的一个 `Tab` ("自定义上传")。
    *   **前端压缩**:
        *   **普通模式**: 裁剪并导出为 800px 宽度的 PNG/JPG。
        *   **主播模式**: 自动压缩为 150px 宽度的 JPEG (Quality 0.8)，优化 Dock 栏内存占用。
    *   **交互细节**: 支持拖拽上传 (Drag & Drop) 和 粘贴上传 (Paste to Upload - 虽代码未显式展示，但通常与 FileInput 配合)。
*   **V3 参考**:
    *   V3 需要将裁剪器做成独立的 `System` 或 `Service`，因为 ECS 中不再直接操作 DOM。
    *   **建议**: 在 V3 中，点击上传后弹出一个专用的 `CropModal`，处理完生成 Blob 再存入 Registry。

### 🎬 视频导出 (Video Export)
**实现文件**: `src/logic/video-export.ts`
*   **V1 逻辑 (黑科技)**:
    *   **双引擎策略**:
        *   **Desktop**: 使用 `VideoEncoder` + `mp4-muxer` (WebCodecs API)，生成高画质 AVC (H.264) MP4。性能极高。
        *   **Fallback**: 使用 `MediaRecorder` 录制 Canvas 流 (WebM/MP4)，兼容性好但画质略差。
    *   **手动绘制 (Manual Draw)**:
        *   不录制 DOM！而是创建离屏 Canvas，一帧一帧地绘制卡片飞入动画 (`renderFrame` 函数)。
        *   **Pros**: 保证 1080P/60FPS 稳定输出，不受浏览器渲染卡顿影响。
*   **V3 参考**:
    *   这是 V3 后期的 "杀手级功能"。必须保留。
    *   需要将 `video-export.ts` 适配为读取 V3 `Registry` 数据的系统。

---

## 2. 核心外观与美学 (Core Aesthetics)

V1 的 "风靡" 很大程度上归功于其 **"杂志感" (Magazine Aesthetic)**。

### 🎨 关键设计 Token (Design Tokens)
**来源**: `src/style.css`, `src/logic/constants/theme.ts`, `Header.vue`

1.  **字体 (Typography)**:
    *   **英/中**: `'Noto Serif SC', serif` 是 **内容 (Canvas)** 的灵魂，用于 "我推的格子" 标题和卡片文字，营造同人志/杂志感。
    *   **UI 字体**: 编辑器界面 (Sidebar, Buttons, Modals) 应保持现代简洁，使用 **无衬线字体 (Sans-Serif)**。不要在 UI 按钮上滥用宋体。

2.  **颜色 (Colors)**:
    *   `Primary`: `#e4007f` (品红/洋红)。用于 选中态、Logo高亮、强调文字。
    *   `Border`: `#000000` (纯黑)。2px 实线边框，强调 "格子" 的硬朗感。
    *   `Background`: `#f9fafb` (Gray-50)。极淡的灰白，避免纯白的刺眼，模拟纸张质感。

3.  **布局细节 (Layout Micro-details)**:
    *   **紧凑网格**: 格子之间 `gap-0`，边框重叠 (collapsed borders)。
    *   **高宽比**: `120 / 212` (极窄长方形)。不仅适合展示人物立绘 (头身比好)，还没留出足够的底部空间写两行字 (作品名+角色名)。
    *   **动态字号**: 也就是 `canvasDraw.ts` 中的 `while(width > max) fontSize--` 逻辑。无论名字多长，永远不会换行，只会变小，保持整洁。

---

## 3. V3 迁移战略总结 (Strategic Migration Plan)

> [!WARNING]
> **关于 V2**: 
> V2 被视为失败的尝试 (Scrap)。V3 的开发应 **严格参考 V1** 的功能和体验，不要沿用 V2 的代码或设计思路，除非另有说明。


1.  **复刻渲染引擎 (The New Renderer)**:
    *   V3 不能依赖 HTML 截图。必须重写一个 `CanvasRenderSystem`，**逐像素复刻** `canvasDraw.ts` 的绘制逻辑 (Padding, Shadow, Fonts)。
    *   这是 V3 能否达到 V1 质量的关键。

2.  **数据层轻量化 (Lightweight Data)**:
    *   V1 使用 `useStorage` + `imagePool` (分离存图)。
    *   V3 已经实现了 `Shallow Copy` 和 `Registry`，下一步是引入 `IndexedDB` 来存储大图，避免阻塞主线程。

3.  **保持 "宋体" 灵魂**:
    *   无论 UI 怎么变，导出的图片和核心编辑器必须强制使用 Serif 字体。

4.  **功能模块化**:
    *   将 `Search`、`Crop`、`VideoExport` 封装为独立的 ECS 工具或 UI 插件，不要耦合在主编辑器组件中。

5.  **Multi-X 架构目标**:
    *   **Multi-Dock**: 不再只有一个底部栏。支持 抽卡堆 (Gacha Pile)、暂存区 (Clipboard) 等多容器。
    *   **Multi-Display**: 除了 Grid，未来支持 Pyramid (金字塔), Tier List (梯队表) 等多种布局展示。
    *   **Multi-Flow**: 数据流动不局限于 "Search -> Grid"，支持更复杂的流式交互。
