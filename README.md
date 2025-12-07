# <img src="./public/logo.png" width="32" height="32" alt="Logo" style="vertical-align: bottom; margin-right: 8px;">【我推的格子】

> **Visualize Your Taste in ACG.**
> 一个现代化的、高颜值的二次元成分表生成器。

![Example](./example.png)

## ✨ 核心特性 (v3.0)

### 🔍 全领域搜索 (New)
打破次元壁！不再局限于角色，现在支持全领域搜索：
- **动画 (Anime)**: 搜番剧，填坑表。
- **游戏 (Game)**: 搜大作，填年度评选。
- **漫画/小说 (Manga/Novel)**: 搜原作，填入坑记录。
- **角色 (Character)**: 经典的“我推”角色。

### 🎨 海量模版库
超过 30+ 种精心设计的模版，满足你的所有脑洞：
- **年度盘点 (2025 Edition)**: 专属的 2025 年度动画、年度游戏评选模版。
- **极简模式 (Minimalist)**: 1x1 唯一真神、2x2 四大天王、3x1 Top3，拒绝填空焦虑。
- **经典系列 (Classic)**: 5x3 经典布局，涵盖本命、初恋、意难平。
- **CP 嗑糖 (Couple)**: 独创双格 CP 模版，支持任意性别组合 (BL/BG/GL)。
- **趣味/梗 (Fun)**: 败犬大合集、妹系/姐系图鉴、RPG 冒险队等。
- **绅士专区 (NSFW)**: 懂的都懂 (⁄ ⁄•⁄ω⁄•⁄ ⁄)。

### 🎬 视频导出 (Beta)
- **静态变动态**: 一键将你的格子生成丝滑的平移视频。
- **极速分享**: 专为短视频平台优化，分享你的二次元成分。

### ⚡️ 极致体验
- **高清导出**: 生成 2k+ 分辨率的高清大图，自带精美水印。
- **自定义图片**: 搜不到？直接上传本地图片，支持裁剪和自定义命名。
- **隐私保护**: 
  - 本地优先：填坑进度自动保存在浏览器。
  - 匿名统计：仅收集匿名化的基础数据用于生成“热门模版”，绝无个人隐私追踪。

## 🚀 快速开始

### 部署指南

本项目基于 Vue 3 + Vite 构建，推荐使用 Cloudflare Pages 全栈部署（支持后端代理）。

1. **Fork** 本仓库到你的 GitHub。
2. 在 **Cloudflare Pages** 中连接你的仓库。
3. **构建设置**：
   - 框架预设: `Vue`
   - 构建命令: `npm run build`
   - 输出目录: `dist`
4. **环境变量 (Cloudflare Dashboard)**:
   - `VITE_BANGUMI_ACCESS_TOKEN`: (可选) 用于提高 Bangumi API 调用频率限制。

### 本地开发

需要 Node.js 18+

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器 (包含 Cloudflare Functions 模拟)
npm run dev
# 访问 http://localhost:5173
```

### 数据库迁移 (可选 - 仅供自行部署)
如果你需要使用“数据收集”功能 (Cloudflare D1):
1. 创建 D1 数据库: `npx wrangler d1 create anime-grid-db`
2. 应用 Schema: `npx wrangler d1 execute anime-grid-db --file=./schema.sql`

## 🛠️ 如何添加新模板

本项目设计了极其灵活的模板系统，无需改动代码逻辑即可添加新模版。

1.  打开文件：`src/logic/templates.ts`
2.  在 `TEMPLATES` 数组中添加配置：

```typescript
{
  id: 'my-new-template',      // 唯一ID
  name: '我的新模板 (4x2)',    // 显示名称
  category: 'fun',            // 分类: character, work, relation, fun, nsfw
  label: '自定义',             // 二级标签
  cols: 4,                    // 列数
  defaultTitle: '我的自定义模版', // 默认大标题
  items: [                    // 格子标签列表
    '标签1', '标签2', '标签3', '标签4',
    '标签5', '标签6', '标签7', '标签8'
  ]
}
```

## 📚 文档

详细的开发文档、技术方案和运营报告请查阅：[Documentation](./docs/README.md)

## 📄 协议

MIT License
