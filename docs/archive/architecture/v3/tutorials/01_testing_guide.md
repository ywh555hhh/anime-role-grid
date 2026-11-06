# V3 Core Kernel 测试指南

## 1. 环境准备
确保已安装依赖：
```bash
npm install
```

## 2. 运行测试
本项目使用 **Vitest** 进行单元测试。V3 的测试文件位于 `src/v3/tests/`。

### 运行所有测试
```bash
npx vitest
```

### 运行 V3 特定测试 (推荐)
为了过滤其他版本的干扰，建议使用路径过滤器：
```bash
npx vitest src/v3
```

### 观察模式 (Watch Mode)
默认情况下 `vitest` 会启动监听模式。修改代码后会自动重跑。按 `q` 退出。

## 3. 测试覆盖范围
目前 Phase 1 包含以下测试套件：

### A. Registry (注册表)
文件: `src/v3/tests/core/registry.test.ts`
- **CRUD**: 增删改查实体和组件。
- **Indexing**: 验证倒排索引是否同步更新。
- **Reactivity**: 验证 Vue 响应式是否生效。

### B. Command (命令系统)
文件: `src/v3/tests/core/command.test.ts`
- **Time Travel**: 验证 `execute` -> `undo` -> `redo` 流程。
- **Snapshot**: 验证数据修改是否影响历史记录（Immutability）。
- **Branching**: 验证“破坏性重做”逻辑（新操作清空 Future）。

## 4. 调试建议
如果测试失败：
1. 检查 `src/v3/core/ecs/types.ts` 中的类型定义。
2. 确保在 `Command.execute` 中正确克隆了数据。
3. 使用 `console.log` 调试时，注意 Vue 的 Proxy 对象可能看起来不直观，可以使用 `JSON.stringify(obj)` 查看真实值。
