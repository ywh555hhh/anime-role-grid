# RFC 010: Universal Asset Browser Design

> **Status**: Draft
> **Feature**: Asset Picker / Browser
> **Layer**: Platform Service + Builtin UI

## 1. 核心决策 (Core Decision)

**Q: 它是 Core Plugin 还是 Platform Service?**

**A: 它是 Platform Service (API) + Core Plugin (UI Implementation)。**

就像 VS Code 的 `window.showQuickPick` 一样：
*   **对于开发者 (Service)**: 它是基础设施。你不需要关心它怎么渲染，只需要调用 `ctx.assets.pick()`。
*   **对于架构 (Plugin)**: 它的 UI 实现 (`asset-browser.vue`) 应该是一个内置插件。这样不仅保持了 Platform 的纯净，也允许未来替换不同的 Browser 实现（比如换成更高级的 3D 选人界面）。

---

## 2. 核心架构：多源扩展 (Extensibility)

用户提到了不仅要支持 Bangumi，还要支持本地上传、纯文本等。这完全契合我们现有的 `ISource` 协议。

### 2.1 The Source Protocol (`ISource`)
我们在 `contracts.ts` 中已经定义了标准的资源提供者接口：

```typescript
export interface ISource {
    id: string;          // e.g. 'builtin.sources.bangumi'
    name: string;        // e.g. 'Bangumi Anime'
    
    // 1. 搜索能力 (UI 驱动)
    search(query: string, page: number): Promise<SourceResult>;
    
    // 2. 实体转化 (核心能力)
    // 将 Source 里的原始数据 (JSON) 转化为 ECS 标准组件 (Components)
    normalize(item: SourceItem): Record<string, any>;
}
```

### 2.2 工作流 (The Workflow)
`AssetService` 将充当所有 `ISource` 的聚合器 (Aggregator)。

1.  **注册**: 插件 (e.g. `BangumiPlugin`) 调用 `ctx.registerSource(new BangumiSource())`。
2.  **发现**: `AssetBrowser` 从 `AssetService` 获取所有可用源，渲染为左侧的 Tag 或顶部的 Tab。
3.  **标准化**:
    *   用户搜索 "Frieren" -> `BangumiSource.search('Frieren')`。
    *   用户选择 Item -> `BangumiSource.normalize(item)`。
    *   Service 返回标准 ECS Data (e.g. `{ Visual: { src: '...', label: '...' } }`)。
4.  **消费**: `Grid` 拿到 ECS Data，直接 `registry.addComponent`，无需知道数据来自 Bangumi 还是 Steam。

---

## 3. API 设计 (The Interface)

我们将在 `IPluginContext` 中暴露一个新的服务：

```typescript
interface IAssetService {
    /**
     * 打开资源选择器
     */
    pick(options: AssetPickerOptions): Promise<AssetPickResult>;
}

interface AssetPickerOptions {
    /**
     * 模式: 
     * - 'single': 选一个就走 (比如: 格子填人) -> Auto Close
     * - 'multiple': 选多个/连续选 (比如: 进货到卡池) -> Stay Open
     */
    mode: 'single' | 'multiple';
    
    /**
     * 允许的数据源 ID 列表 (为空则显示所有)
     * e.g. ['bangumi', 'local-files']
     */
    sources?: string[];
    
    /**
     * 初始搜索词
     */
    initialQuery?: string;
    
    /**
     * 标题 (显示在弹窗顶部)
     * e.g. "Select a Character for Grid #5"
     */
    title?: string;
}

type AssetPickResult = Asset[] | null; // null means cancelled
```

---

## 3. 交互流程设计 (UX Flows)

你提到的两种场景将通过 `mode` 参数完美支持。

### 场景 A: 格子填人 (Single Mode)
*   **触发**: 用户点击格子中心的 `+`。
*   **调用**: `ctx.assets.pick({ mode: 'single', title: '填入格子' })`
*   **行为**:
    1.  弹出 Modal。
    2.  用户点击 "Frieren"。
    3.  **Modal 自动关闭**。
    4.  Promise resolve `[FrierenEntity]`.
    5.  Grid 收到数据，填充格子。

### 场景 B: 卡池进货 (Multiple Mode)
*   **触发**: 用户点击 Dock (Pool) 的 `+`。
*   **调用**: `ctx.assets.pick({ mode: 'multiple', title: '批量进货' })`
*   **行为**:
    1.  弹出 Modal。
    2.  用户点击 "Frieren"。
    3.  **Modal 不关闭**。出现一个小动画（飞入效果），提示已添加。
    4.  Dock 收到 "Frieren" 并加入列表。
    5.  用户继续点击 "Fern", "Stark"...
    6.  Dock 持续收到数据。
    7.  用户手动点击 "完成" 或 "关闭" 按钮 (X) 关闭 Modal。

---

## 4. 架构图 (Architecture Diagram)

```mermaid
graph TD
    subgraph "Layer 3: Plugins"
        GridPlugin[Grid Plugin]
        DockPlugin[Pool Dock Plugin]
    end

    subgraph "Layer 2: Platform"
        Service[AssetService (API)]
        Overlay[OverlayManager]
    end
    
    subgraph "Layer 3: Builtin Plugins"
        BrowserUI[AssetBrowser UI]
    end

    GridPlugin -->|1. pick({mode: single})| Service
    DockPlugin -->|1. pick({mode: multiple})| Service
    
    Service -->|2. open()| Overlay
    Overlay -->|3. render| BrowserUI
    
    BrowserUI -->|4. onSelect| Service
    Service -->|5. resolve| GridPlugin
```

## 5. 总结

*   **身份**: 它是一个标准的 Platform Service (`ctx.assets`)。
*   **实现**: UI 部分由内置插件提供。
*   **设计**: 通过 `mode: 'single' | 'multiple'` 区分“选完即走”和“连续作业”两种交互流。
