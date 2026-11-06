# 09. 项目全景概览 (Full Project Overview)

> [!NOTE]
> 本文档是 V2 架构的“总指挥部”，汇总了开发路线、全功能清单、设计语言以及未来商业化蓝图。所有的开发决策都应以此为最终依据。

## 1. 开发路线图 (Development Roadmap)

采用 **Sprint (冲刺)** 模式进行，每个阶段都有明确的验收标准。

| 阶段 | 代号/名称 | 核心任务 | 验收成果 (Acceptance Criteria) |
| :--- | :--- | :--- | :--- |
| **Phase 0** | **Isolation** (完成) | 环境搭建 | 1. `/v2` 路由打通。<br>2. `src/v2` 目录结构建立。<br>3. `shared` 目录建立。 |
| **Phase 1** | **Foundation** | 基础设施 | 1. **Drizzle ORM** 连接成功。<br>2. **Zod Schemas** (`Photo`, `Card`, `Template`) 定义完成。<br>3. **i18n** 跑通，支持中英切换。 |
| **Phase 2** | **The Core** | 领域核心 | 1. **Photo Provider**: 成功搜索 Bangumi 并返回数据。<br>2. **Dock System**: 实现“无限滚动列表”池子。<br>3. **Grid System**: 画布渲染出空格子，支持响应式布局。 |
| **Phase 3** | **The Editor** | 交互实现 | 1. **Drag & Drop**: 从 Dock 拖拽 Photo 到 Grid。<br>2. **State Sync**: Pinia 状态正确记录 Card 位置。<br>3. **Export**: 将画布导出为高清图片 (html2canvas / dom-to-image)。 |
| **Phase 4** | **Replication** | 功能对齐 | 1. **Easter Eggs**: 移植 V1 的所有彩蛋逻辑 (Rule Engine)。<br>2. **Templates**: 迁移 V1 的所有模板数据。 |
| **Phase 5** | **Evolution** | 高级特性 | 1. **Streamer Mode**: 实现主播轮抽 (Draft) 模式。<br>2. **Party War**: 实现基于 D1 的党争统计后端。 |

---

## 2. 全功能清单 (Full Feature List)

### 2.1 核心功能 (Core Features)
*   **多模板支持**: 
    *   **Character (角色类)**: 经典5x3, CP问卷, 发色图鉴等。
    *   **Work (作品类)**: 年度动画, 游戏综合, 音乐鉴赏等。
    *   **Relation (关系类)**: CP, 家庭关系。
    *   **Fun/NSFW**: 梗图, 甚至“绅士”问卷。
*   **图片获取**:
    *   **Bangumi Search**: 关键词搜索角色/动画，自动获取封面。
    *   **Local Upload**: 支持本地图片上传（裁剪功能可选）。
*   **智能填表**:
    *   **Quick Fill**: 点击格子直接搜索填入。
    *   **Drag & Drop**: (V2 新增) 拖拽填入。
    *   **Auto Crop**: 自动适配格子比例（正方形/长方形）。
    *   **Custom Aspect Ratio**: (V2 新增) 用户可自定义格子的长宽比数值（如 3:4, 16:9），不再局限于正方形。
*   **图片导出**:
    *   生成高质量 PNG/JPG。
    *   自动添加水印/版权信息。

### 2.2 辅助功能 (Auxiliary Features)
*   **Streamer Mode (主播模式)**:
    *   隐藏敏感 UI (如删除按钮)。
    *   提供 OBS 友好的绿幕/透明背景支持。
    *   (V2) **Draft Flow**: 轮抽选卡玩法。
*   **Statistics (党争统计)**:
    *   记录每个格子被填入最多的角色（“最受欢迎的老婆”）。
    *   展示 Top 10 排行榜。
*   **Custom Template (自定义模板)**:
    *   用户可上传自定义底图，定义格子位置（JSON Config）。

### 2.3 彩蛋系统 (Easter Egg System)
基于关键词匹配的隐藏交互，目前包含：
*   **MyGO!!!!!**: 触发“一辈子”语录，引流 B 站。
*   **Ave Mujica**: 触发祥子语录。
*   **BanG Dream**: 邦邦人集合。
*   **Girls Band Cry (GBC)**: 竖起中指。
*   **Bocchi the Rock**: 孤独摇滚语录。
*   **Kaguya-sama**: 恋爱头脑战。
*   **Makeine (败犬女主)**: 败犬赢家语录。
*   **Oshi no Ko (推子)**: 谎言是爱。
*   **Oregairu (春物)**: 真物语录。
*   **Mushoku Tensei (无职)**: 拿出真本事。

---

## 3. 设计语言 (Design Language)

V2 将严格继承 V1 的视觉基因，但在细节上进行原子化规范。

### 3.1 核心色板 (Color Palette)
*   **Primary (主色)**: `#e4007f` (Magenta/Pink - 象征“推/爱”)
    *   `hover`: `#c2006b`
    *   `light`: `#fce7f3`
*   **Neutral (中性色)**:
    *   `Text`: `#213547` (Dark Blue Gray) - 用于正文
    *   `Bg`: `#ffffff` (White) / `#242424` (Dark Mode)
    *   `Border`: `#e5e7eb` (Light Gray)
*   **Warning/Error**: 仅在错误状态使用红色，平时保持界面纯净。

**设计原则**: 这是一个“画廊”应用。界面应当是黑白的画布，色彩只属于用户的“推”(#e4007f) 和 图片本身。

### 3.2 字体栈 (Typography)
*   **Font Family**: `system-ui`, `Avenir`, `Helvetica`, `Arial`, `sans-serif` (优先系统字体，保证流畅)。
*   **Web Font**: `Noto Serif SC` (用于标题展示，营造文学感/高级感)。

### 3.3 圆角与阴影 (Shape & Depth)
*   **Border Radius**:
    *   `std`: `0.75rem` (12px) - 卡片标准圆角。
    *   `btn`: `9999px` (Pill Shape) - 按钮圆角。
*   **Shadow**: 轻微的 `shadow-sm` 用于卡片，`shadow-md` 用于悬浮元素。

### 3.4 Logo 逻辑
*   **Icon**: `/logo.png` (通常是一张方形的 Grid 图标或特定的二次元符号)。
*   **Title**: "【我推的格子】" (Anime Role Grid)。

---

## 4. 商业化与高级蓝图 (Monetization & Future)

(参考 07_Advanced_Features.md 和 08_Monetization_Strategy.md)

*   **皮肤系统**: 允许用户购买/解锁高级 CSS 主题（如“赛博朋克”、“水墨风”）。
*   **Pro 会员**:
    *   无限制保存云端模板。
    *   自定义 Footer 水印。
    *   解锁 8k 超清导出。
*   **推广位**: 在“抽卡池”中植入合作 VTuber 或新番角色（非侵入式广告）。
