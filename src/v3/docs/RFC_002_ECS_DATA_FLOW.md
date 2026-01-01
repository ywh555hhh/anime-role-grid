# RFC 002: ECS Data Flow & Platform Feasibility Analysis

> **Status**: Output of Architecture Validation
> **Question**: "Is ECS suitable for the Platform Interface? Will cards flow smoothly?"

## 1. 结论 (Verdict)
**ECS 是实现 "Platform Architecture" 的天选之子。**

在传统 OOP (面向对象) 中，"流转" 是痛苦的。
*   `DockItem` 对象 -> 转换 -> `GridItem` 对象。
*   你需要不断地 `new` 和 `destroy` 对象，或者写复杂的 Mapper。

在 V3 ECS 中，**"流转" (Flow) 仅仅是 "贴标签" (Tagging)。**
实体 (The Card) 永远是同一个 ID，我们只是换了它的组件。

---

## 2. 数据流演示 (The Flow Demo)

假设一个场景：用户从 **Bangumi 源** 搜索到一个角色，拖到 **暂存区 (Dock)**，最后拖进 **标准九宫格 (Grid)**。

### Step 1: Source -> Dock
用户在 `BangumiSource` (Plugin) 点击 "添加"。

```typescript
// 1. 创建实体 (Entity Created)
const entityId = registry.createEntity();

// 2. 添加核心数据 (这是 "卡片" 的本质)
registry.setComponent(entityId, 'Visual', { src: 'http://bgm.tv/1.jpg' });
registry.setComponent(entityId, 'Meta', { name: 'Saito' });

// 3. 标记为 "在暂存区"
registry.setComponent(entityId, 'Location', { 
    containerId: 'dock-1', 
    slotIndex: 0 
});
```

### Step 2: Dock -> Grid (The Flow)
用户把卡片从 Dock 拖到 Grid 的 (2, 2) 位置。

**传统 OOP 做法**:
```typescript
// ❌ 错误示范
dock.removeItem(item);
grid.addItem(new GridItem(item.data)); // 发生了一次克隆/转换
```

**V3 ECS 做法**:
```typescript
// ✅ 正确示范: 零拷贝，零销毁
const command = createBatchCommand([
    // 1. 移除 "暂存区" 标签
    { type: 'REMOVE', entityId, component: 'Location' },
    
    // 2. 添加 "网格位置" 标签
    { type: 'SET', entityId, component: 'GridPosition', value: { x: 2, y: 2 } }
]);

// 执行！同一个 entityId，瞬间瞬移。
registry.execute(command);
```

---

## 3. 为什么 Interface 很好写？

基于 ECS，我们将接口定义简化为 **"查询契约" (Query Contract)**。

### 视图接口 (The View Interface)
任何 View 插件不需要关心 "Entity 是哪来的"，它只关心 "它有没有我要的组件"。

```typescript
interface IView {
  // 声明：我这个视图只关心带有 [GridPosition, Visual] 的实体
  readonly query: ComponentType[]; 
  
  render(entities: Entity[]): VueComponent;
}
```

**StandardGridView 实现**:
```typescript
class StandardGridView implements IView {
  query = ['GridPosition', 'Visual']; // 我只渲染有位置的实体

  render(entities) {
      // 这里的 entities 已经是筛选好的
      // 即使世界里有 1000 个在 Dock 里的实体，我都看不到
      // 我只渲染 Grid 里的。
  }
}
```

**GachaDock (抽卡堆) 实现**:
```typescript
class GachaDock implements IView {
  query = ['InGachaPool']; // 我只渲染在抽卡池里的实体
  
  // 同样的一批实体，只要加了 InGachaPool 组件，就会自动出现在这里
}
```

---

## 4. 前景分析 (Future Prospects) 🚀

这种架构非常有前景，原因如下：

1.  **降维打击**: 
    *   现在的竞品大多是 "死工具"（只能做 Bingos，或者只能做 TierList）。
    *   你是 **"通用资产数据库"**。用户只要录入一次老婆/老公（Entity），就可以今天把她放在 Grid 里展示，明天把她拖到 TierList 里排级，后天把她放到 Timeline 里做编年史。
    *   **数据不随视图销毁**。

2.  **生态壁垒**:
    *   一旦有人写了 "原神数据源插件" (自动抓取卡池)，你的平台就有了原神用户。
    *   一旦有人写了 "战力排行视图插件"，你的平台就有了战力党用户。
    *   VS Code 赢在插件，你也能赢在插件。

3.  **技术护城河**:
    *   ECS 保证了即使有 10,000 张卡片，流转依然是 O(1) 的组件增删。性能上限极高。

**结论**: 放手去干。ECS + Platform Interface 是绝配。
