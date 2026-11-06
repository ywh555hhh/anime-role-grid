# 06. 图片源抽象 (Photo Source Abstractions)

## 1. 核心需求
目前的图片来源主要有两个：**Bangumi 搜索** 和 **本地上传**。
为了支持未来的扩展（如 Anilist, Pixiv, Google Image），我们需要一个统一的 **Photo Provider (图片提供者)** 抽象层。

## 2. 核心接口 (Core Interfaces)

### 2.1 `IPhotoProvider` 接口
所有的图片源（无论是 API 还是本地行为）都必须实现这个接口。

```typescript
interface IPhotoProvider {
  /**
   * 唯一标识符，例如 'bangumi', 'local', 'anilist'
   */
  id: string;

  /**
   * 显示名称，支持 i18n key，例如 'provider.bangumi'
   */
  label: string;

  /**
   * 图标 (Iconify string)
   */
  icon: string;

  /**
   * 搜索方法
   * @param query 用户输入的关键词
   * @param options 分页或过滤参数
   */
  search(query: string, options?: SearchOptions): Promise<Photo[]>;

  /**
   * 解析详情方法 (可选)
   * 用于从 ID 恢复 Photo 对象 (当加载存档时)
   */
  resolve?(photoId: string): Promise<Photo>;
}
```

### 2.2 `IPhotoUploader` 接口 (上传者)
专门处理文件上传的接口，继承自 Provider 概念。

```typescript
interface IPhotoUploader extends IPhotoProvider {
  /**
   * 上传文件
   * @param file 浏览器 File 对象
   */
  upload(file: File): Promise<Photo>;
}
```

---

## 3. 具体实现策略 (Implementations)

### 3.1 Bangumi Provider (当前核心)
*   **ID**: `bangumi`
*   **职责**: 调用 Bangumi API 搜索角色/条目。
*   **适配器 (Adapter)**: 将 Bangumi API 返回的 JSON 转换为标准的 `Photo` 对象。
    *   `Bangumi.images.grid` -> `Photo.url`
    *   `Bangumi.id` -> `Photo.originId`
    *   `subjectType` -> `Photo.meta.sourceWork`

### 3.2 Local Provider (本地上传)
*   **ID**: `local`
*   **职责**: 处理用户拖拽/点击上传的图片。
*   **处理流**:
    1.  用户选择文件。
    2.  利用 `vue-cropper` 或类似工具进行裁剪（可选）。
    3.  生成 Blob URL 或 Base64 (短期内)。
    4.  **优化**: 使用 `IndexedDB` 存储大图片，而不是放在 LocalStorage，以避免配额限制。

### 3.3 Future Providers (未来扩展)
通过这个抽象，我们可以轻松接入：
*   **Anilist**: 针对英语用户。
*   **Pixiv**: 针对二创图。
*   **Moegirl (萌娘百科)**: 针对中文 Wiki 数据。

---

## 4. 统一图片服务 (Unified Photo Service)

前端 UI 不应该直接调用 `BangumiProvider`，而应该调用统一的 `PhotoService`。

```typescript
class PhotoService {
  private providers: Map<string, IPhotoProvider> = new Map();

  // 注册一个新的源
  register(provider: IPhotoProvider) { ... }

  // 聚合搜索 (可选项：同时搜多个源)
  async searchAll(query: string): Promise<Photo[]> {
    // 并行调用所有 Provider 的 search
  }

  // 获取特定源
  getProvider(id: string) { ... }
}
```

这一层抽象使得我们可以随时“热插拔”图片源，甚至允许用户在设置中开关特定的图片源。

## 5. 错误处理策略：Best Effort (尽力而为)

当用户调用 `searchAll(query)` 聚合搜索时，必须使用 **Partial Failure** 策略：

1.  **并发请求**: 使用 `Promise.allSettled([bangumi.search(), anilist.search(), ...])`。
2.  **降级处理**:
    *   如果 Bangumi 挂了但 Anilist 成功，**不应该抛出错误**。
    *   而是返回 Anilist 的结果，并在 UI 上显示一个非阻塞的 Toast: *"Bangumi 源暂时不可用"*。
3.  **完全失败**: 只有当所有启用的源都失败时，才抛出 Exception。

