# TODO: 模板市场改进计划

> 基于 Serverless + 用户容易丢数据的特点，优先实现本地持久化功能

## 背景
- Serverless 无状态，用户换浏览器/清缓存可能丢失数据
- 需要用 localStorage 做一些本地持久化的功能

---

## P0 - 紧急/简单

### 1. 🆕 NEW 角标
- **问题**: 用户不知道哪些是新模板
- **方案**: 在 `templates.ts` 中添加 `badge` 字段
- **实现位置**: `src/components/TemplateGalleryModal.vue`
- **难度**: ⭐ 简单 (1小时内)
- **状态**: ✅ 已完成 (2026-03-06)
- **实现内容**:
  - 新增 `badge` 字段，支持: hot, new, recommend, classic, limited, pure
  - 每个角标有不同的颜色和 emoji

### 2. ⭐ 收藏功能
- **问题**: 用户担心找不到喜欢的模板
- **方案**: localStorage 存储收藏的模板 ID 列表
- **实现位置**:
  - 新增 `src/composables/useFavoriteTemplates.ts`
  - 修改 `TemplateGalleryModal.vue` 添加收藏按钮
- **难度**: ⭐ 简单
- **数据存储**:
  ```ts
  // localStorage key: 'favorite_templates'
  const favorites = ['template_id_1', 'template_id_2']
  ```

### 3. 🕐 最近使用
- **问题**: 快速找到上次在用的模板
- **方案**: localStorage 存储最近使用的模板 ID 列表 (最多5个)
- **实现位置**: 同上
- **难度**: ⭐ 简单

---

## P1 - 中等

### 4. 🔥 使用统计
- **问题**: 用户想知道自己的模板多火
- **方案**: 查询 D1 数据库统计模板使用次数
- **实现位置**:
  - 后端: `functions/api/stats/template/[id].ts` (已有部分)
  - 前端: `TemplateGalleryModal.vue` 显示 usageCount
- **难度**: ⭐⭐ 中等

### 5. 🔍 搜索功能
- **问题**: 快速检索模板
- **方案**: 前端过滤模板名称
- **实现位置**: `TemplateGalleryModal.vue`
- **难度**: ⭐⭐ 中等

---

## P2 - 暂不急

### 6. 🖼️ 模板预览图
- 卡片添加缩略图预览
- 需要为每个模板生成预览图
- 难度: ⭐⭐⭐ 较难

### 7. 🎲 换一换随机推荐
- 随机展示模板
- 难度: ⭐⭐ 中等

### 8. 📤 分享功能
- 生成分享链接
- 难度: ⭐ 简单

---

## 数据层设计

```ts
// localStorage keys
const STORAGE_KEYS = {
  FAVORITES: 'template_favorites',      // string[]
  RECENT: 'template_recent',              // string[]
  LAST_USED: 'template_last_used'         // string
}
```

---

## 实施顺序

1. 先做 P0 的三个功能 (NEW角标 + 收藏 + 最近使用)
2. 然后做 P1 的搜索和统计
3. 最后做 P2

---

*最后更新: 2026-03-06*
