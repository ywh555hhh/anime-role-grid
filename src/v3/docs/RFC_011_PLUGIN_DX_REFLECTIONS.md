# RFC 011: 插件开发体验反思与未来改进 (Plugin DX Reflections)

> **Status**: Draft
> **Author**: Antigravity (AI Agent)
> **Context**: 基于 StandardGridPlugin 开发过程中的踩坑经验总结。

## 1. 背景与宏观要求 (Background & Macro Goals)

用户对于 Grid 功能的核心宏观要求可以总结为：
1.  **像素级复刻 (Pixel Perfect)**: 必须完美还原 V1 版本的视觉体验（宋体、边框、布局），不能因为架构升级而牺牲美感。
2.  **架构纯洁性 (Architecture Purity)**: 必须严格遵守 V3 的 ECS + Plugin 架构，不能写面条代码。
3.  **极致的用户体验 (Seamless UX)**: 所有的状态（包括 toggle 按钮）都必须持久化，且操作必须即时响应（Reactivity）。

在此过程中，我们遇到了几个关键的“认知陷阱”和架构痛点。

---

## 2. 踩坑记录 (Pitfalls & Lessons)

### 2.1 性能优化的反噬：ECS Cache vs Vue Reactivity
*   **现象**: 当我们添加/删除组件时，UI 没有自动更新。
*   **原因**: 为了追求性能，我们在 `Registry.query()` 中实现了一个手动缓存层。但这个缓存返回的是普通 Set，**绕过了 Vue 的依赖收集系统**。
*   **教训**: 在前端重交互场景下，**正确性 > 微小的性能优化**。
*   **结论**: 直接暴露 Vue 的 Reactive 对象给 UI 层，或者使用 `computed` 来包装查询。对于 < 1000 个实体的场景，不要手动做 Query Cache。

### 2.2 动作按钮的流放：View vs Shell
*   **痛点**: 用户要求把“显示名字”等按钮从 Grid 内部移到全局 Toolbar。
*   **后果**: 我们被迫修改了四层代码来传递一个点击事件：
    1.  `V1Toolbar.vue` (UI Emit)
    2.  `NormalLayout.vue` (Shell Listener -> Command Invoke)
    3.  `StandardGridPlugin.ts` (Command Registration)
    4.  `StandardGridSystem.ts` (Command Handler -> ECS Update)
*   **反思**: 这对于插件开发者来说心智负担极重。为了加一个按钮，需要在 Shell 代码里写硬编码逻辑，这是**架构设计上的泄露**。

### 2.3 状态的持久化地狱
*   **现象**: “重置文字”功能最初会将格子重置为 "Slot N"，而不是模板默认的 "角色名"。
*   **原因**: 系统（System）在运行时不知道当前的“模板配置”是什么。
*   **教训**: System 应当是无状态的，但它需要能够访问全局的上下文（Context/Services）。

---

## 3. 未来展望：如何最小化心智负担？(Zero Mental Load DX)

为了让未来的插件开发者（无论是人还是 AI）写最少的代码，我们需要对架构进行以下改进：

### 3.1 声明式 UI 贡献 (Declarative UI Contributions)
**现状**: 手动在 Layout 里写按钮。
**未来**: 在 `IPlugin` 接口中直接声明 Toolbar Action。

```typescript
// 理想的插件定义
export const MyPlugin: IPlugin = {
    // ...
    contributions: {
        toolbar: [
            {
                id: 'my.toggle',
                icon: 'i-carbon-text-font',
                label: '显示名字',
                type: 'toggle',
                // 直接绑定到 ECS Component 的某个属性
                bind: { component: 'GridState', prop: 'showNames' } 
            },
            {
                id: 'my.reset',
                icon: 'i-carbon-reset',
                label: '重置',
                command: 'grid.resetLabels' // 绑定命令
            }
        ]
    }
}
```
**收益**: Shell 会自动渲染这些按钮，无需修改 `V1Toolbar` 或 `NormalLayout` 代码。

### 3.2 响应式查询 Hook (`useEntityQuery`)
**现状**: 手动在 Vue 组件里写 `computed` + `registry.query`。
**未来**: 提供标准 Composable。

```typescript
// StandardGridView.vue
const { entities } = useEntityQuery({
    all: ['Layout', 'Visual'],
    sort: (a, b) => a.layout.order - b.layout.order
});
// entities 自动是 Reactive 的，且自带类型推导
```

### 3.3 智能默认值与上下文注入
**现状**: 手动 import `presetService`。
**未来**: System 的 Update 方法或 Command Handler 自动注入 Context。

```typescript
handleCommand(cmd, { registry, preset }: Context) {
   // 直接拿到 preset，不再需要自己去 import 单例
   const defaults = preset.current.config.items;
}
```

## 4. 总结

V3 架构目前的**灵活性极高**（ECS + Command），但**开发便捷性（DX）由低**。
当前的“繁琐”是解耦的代价。
下一步的架构迭代重心，应从“功能实现”转向“开发者体验”，通过**配置化**和**Hook化**来封装底层的样板代码。
