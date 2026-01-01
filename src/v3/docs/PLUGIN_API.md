# Plugin API Reference (V3)

> **Status**: Draft
> **Version**: 3.0.0-alpha.1
> **Stability**: Experimental

本文档定义了 V3 引擎插件开发的标准接口契约。所有插件必须通过此 API 与宿主环境交互，**严禁**直接访问或修改内部私有属性。

---

## 1. 核心概念 (Concepts)

插件 (Plugin) 是 V3 的一等公民。一个插件通常包含：
1.  **Manifest**: 描述插件的元数据 (ID, Version, Presets)。
2.  **Activation**: 插件激活时的生命周期钩子，宿主会注入 `IPluginContext`。
3.  **Systems**: 注册到 ECS 循环中的逻辑系统。
4.  **Views**: 注册到 Workbench 的 UI 组件。

---

## 2. 插件上下文 (IPluginContext)

`IPluginContext` 是插件与 V3 引擎交互的唯一桥梁。

```typescript
export interface IPluginContext {
    /**
     * 核心 ECS 注册表
     * 用于直接读写实体组件数据 (Low-level Access)。
     */
    readonly registry: IRegistry;

    /**
     * 系统管理器
     * 用于注册/注销逻辑系统 (System)。
     */
    readonly systems: ISystemManager;

    /**
     * 命令服务 (Command Bus)
     * High-level 业务操作入口。所有状态变更建议通过 Command 触发。
     * @example ctx.commands.execute('entity.move', { id: 'e1', x: 10 })
     */
    readonly commands: ICommandService;

    /**
     * 界面服务
     * 用于打开弹窗、Toast 提示、注册侧边栏等。
     */
    readonly ui: IWorkbenchUI;

    // --- Registry Shortcuts ---
    
    /** 注册一个新的视图 */
    registerView(view: IViewContribution): void;
    
    /** 注册一个新的数据源 */
    registerSource(source: ISourceContribution): void;
    
    /** 注册一个新的面板 */
    registerDock(dock: IDockContribution): void;
}
```

---

## 3. 命令服务 (Command Service)

命令是解耦 "意图" 与 "实现" 的关键。

### 接口定义

```typescript
// From src/v3/platform/contracts.ts
export interface IDisposable {
    dispose(): void;
}

export interface ICommandService {
    /**
     * 执行一个命令
     * @param commandId 命令唯一标识符 (e.g. 'entity.create')
     * @param payload 参数对象
     */
    execute<T = any>(commandId: string, payload?: any): Promise<T>;

    /**
     * 注册一个命令处理程序
     * @param id 命令ID
     * @param handler 处理函数
     * @param metadata (可选) 命令元数据，用于 UI 显示
     */
    register(
        id: string, 
        handler: (payload: any) => Promise<any> | any,
        metadata?: { title?: string; category?: string }
    ): IDisposable;
}
```

### 标准内置命令 (Standard Commands)

| Command ID | Payload | Description |
| :--- | :--- | :--- |
| `entity.create` | `{ components?: Record<string, any> }` | 创建新实体 |
| `entity.delete` | `{ id: string }` | 删除实体 |
| `grid.generate` | `{ cols: number, rows?: number }` | 生成标准网格 |
| `ui.openOverlay`| `{ id: string, props?: any }` | 打开指定弹窗 |

---

## 4. 开发范例 (Example)

```typescript
export const MyPlugin: IPlugin = {
    id: 'community.my-plugin',
    activate(ctx: IPluginContext) {
        
        // 1. 注册一个自定义命令
        ctx.commands.register('my-plugin.hello', async (name) => {
            ctx.ui.toast(`Hello, ${name}!`);
        });

        // 2. 调用内置命令生成网格
        ctx.commands.execute('grid.generate', { cols: 5 });
        
        // 3. 注册视图
        ctx.registerView({
            id: 'my-plugin.view',
            component: MyViewComponent
        });
    }
}
```
