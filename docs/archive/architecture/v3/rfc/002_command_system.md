# RFC 002: Command System Architecture (命令系统架构)

## 0. 概览
本 RFC 定义了 V3 引擎中用于处理用户操作、撤销/重做（Time Travel）的核心机制。采用经典的 **Command Pattern (命令模式)**，结合 **State Clone (状态快照)** 策略。

## 1. 核心概念

### 1.1 Command (命令原子)
所有对 World 的状态变更（Mutation）必须封装在 Command 中。严禁直接调用 Registry 修改 state (除非是初始化 loader)。

接口定义：
```typescript
interface ICommand {
  execute(registry: IRegistry): void;
  undo(registry: IRegistry): void;
}
```

### 1.2 History Stack (历史栈)
维护双栈结构：
- `past`: 已执行的命令栈。
- `future`: 已撤销的命令栈（用于重做）。

**破坏性重做 (Destructive Redo):**
当 `future` 不为空时，如果用户执行了新的命令，`future` 栈将被清空。这意味着用户开启了新的时间线，旧的时间线被丢弃。

### 2. 实现策略

### 2.1 快照机制 (Snapshotting)
为了保证 Undo 的准确性，我们在 `execute` 执行的瞬间记录 `oldData`。
- **Clone Strategy**: 使用 `structuredClone` (优先) 或 `JSON.parse(JSON.stringify)`。
- **Immutability**: 存入 Command 的数据必须是完全的副本，防止后续对象引用被外部修改污染历史。

### 2.2 原子命令工厂 (Atomic Factories)
提供工厂函数生成基础命令：
- `createSetComponentCommand`: 通用的组件设置/更新/删除（如设为 undefined）命令。
- 未来扩展: `createMoveEntityCommand` (移动), `createBatchCommand` (组合命令).

## 3. 性能考量
- **内存控制**: HistoryStack 支持 `maxHistoryLength`（默认 50），避免长会话导致内存溢出。
- **序列化**: Command 结构简单，易于序列化传输（为未来的多人协作/重放系统做准备）。

## 4. 示例用法
```typescript
const cmd = createSetComponentCommand(entityId, 'Position', { x: 10, y: 10 });
history.execute(cmd); // Pos = 10
history.undo(); // Pos = Old Value
```
