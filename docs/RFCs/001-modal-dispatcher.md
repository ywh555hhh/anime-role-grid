# RFC 001: 全局弹窗调度系统 (Modal Dispatcher)

- **状态**: 已采纳 (Implemented)
- **创建日期**: 2025-12-30

## 1. 背景与问题 (Context)
在旧版本中，弹窗（Modal）的控制逻辑散落在 `Home.vue` 和各个组件内部，通过布尔值旗标（Flags）和定时器（setTimeout）进行生硬的串联。这导致了以下问题：
- **UI 割裂**：多个弹窗可能同时出现并重叠。
- **逻辑混乱**：难以管理弹窗的显示顺序（例如：必须先显示公告，再显示每日引导，最后显示热门推荐）。
- **扩展性差**：新增一个“彩蛋弹窗”需要修改核心代码路径。

为了解决这些问题，我们引入了 **Modal Dispatcher**。

## 2. 核心架构

### 2.1 优先级队列 (Priority Queue)
系统维护一个全局的弹窗任务队列 `queue`，每个任务都有一个 priority（优先级）。
调度器始终只渲染队列中 **优先级最高** 的任务。

**优先级常量 (`MODAL_PRIORITY`)**:
- `SYSTEM (1000)`: 系统级通知（强更、错误）。
- `INTERACTION (500)`: 用户强交互（导出成功、分享页面）。
- `GUIDE (300)`: 引导流程（首次进入引导）。
- `PROMOTION (100)`: 运营推广（彩蛋引流、关注请求）。

### 2.2 抢占式调度 (Preemptive Scheduling)
- 如果当前正在显示一个低优先级弹窗（如彩蛋），此时来了一个高优先级任务（如导出成功），高优先级任务会立即 **抢占 (Preempt)** 显示位置。
- 被抢占的任务 **不会丢失**，它仍然保留在队列中。当高优先级任务关闭后，调度器会再次扫描队列，重新唤起剩下的最高优先级任务。

## 3. 使用指南

### 3.1 提交弹窗任务
在任何组件中引入 `useModalStore` 即可提交任务：

```typescript
import { useModalStore, MODAL_PRIORITY } from '~/stores/modalStore'
import MyCustomModal from './MyCustomModal.vue'

const modalStore = useModalStore

function trigger() {
  modalStore.openModal(MyCustomModal, {
      show: true,
      someProp: 'value',
      onClose: () => modalStore.closeModal() // 必须处理关闭回调
  }, MODAL_PRIORITY.INTERACTION)
}
```

### 3.2 接入彩蛋系统 (Easter Eggs)
彩蛋系统 (Easter Egg System) 也是构建在此架构之上的一个模块。
- **触发时机**：用户导出图片成功后。
- **逻辑位置**：`src/logic/easterEggs.ts`
- **优先级**：`PROMOTION (100)`。这意味着它会排在“导出成功”弹窗之后显示，不会喧宾夺主。

## 4. 文件结构
- `src/stores/modalStore.ts`: 核心状态与调度逻辑。
- `src/components/ModalDispatcher.vue`: 全局单例 UI 容器（挂载于 App.vue）。
- `src/logic/easterEggs.ts`: 彩蛋配置与匹配算法。

## 5. 优势
- **解耦**：业务组件不需要知道弹窗的具体实现，只需提交任务。
- **用户体验**：彻底解决了弹窗重叠问题，保证了信息的有序触达。
- **可维护性**：新增弹窗无需修改现有链条，只需定义优先级。
