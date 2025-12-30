
import { ref, computed } from 'vue'

// 定义弹窗的优先级常量
export const MODAL_PRIORITY = {
    SYSTEM: 1000,      // 全局系统级通知 (Force Update, Error)
    INTERACTION: 500,  // 用户主动操作触发 (Export Success, Share)
    GUIDE: 300,        // 引导流程 (First Time Guide)
    PROMOTION: 100,    // 运营推广 (Easter Eggs, Follow Request)
    DEFAULT: 0
}

export interface ModalTask {
    id: string
    component: string | object // 组件名(全局注册) 或 组件对象
    props?: Record<string, any>
    priority: number
    resolve?: (value: any) => void // 支持 Promise 等待关闭
}

// 简单的 ID 生成器
let _id = 0
const generateId = () => `modal_${Date.now()}_${_id++}`

/**
 * 全局弹窗调度器
 * 核心逻辑：
 * 1. 维护一个 activeModal (当前显示的)
 * 2. 维护一个 queue (等待显示的)
 * 3. 总是优先显示 priority 最高的
 * 4. 高优先级可以打断低优先级 (插队)，低优先级会被放回队列
 */
export const useModalStore = (() => {
    // State
    const queue = ref<ModalTask[]>([])
    const activeModalId = ref<string | null>(null)
    const isPaused = ref(false) // 支持暂停队列 (比如全屏播放视频时)

    // Current Modal Logic
    const activeModal = computed(() => {
        if (!activeModalId.value) return null
        return queue.value.find(m => m.id === activeModalId.value) || null
    })

    // Scheduler: Decide what to show next
    const schedule = () => {
        if (isPaused.value) return

        if (queue.value.length === 0) {
            activeModalId.value = null
            return
        }

        // Sort queue by priority DESC
        // Stable sort is nicer but priority is key
        const sorted = [...queue.value].sort((a, b) => b.priority - a.priority)
        const highest = sorted[0]

        // If nothing is showing, show highest
        if (!activeModalId.value && highest) {
            activeModalId.value = highest.id
            return
        }

        // If something IS showing
        const current = queue.value.find(m => m.id === activeModalId.value)

        // Safety check: if current id not in queue (shouldn't happen if managed correctly), clear it
        if (!current) {
            activeModalId.value = null
            schedule()
            return
        }

        // Preemption Logic: If highest priority > current priority, switch
        if (highest && highest.priority > current.priority) {
            // PREEMPT!
            // Current stays in queue but loses active status
            // In a real UI, this might implicitly close the modal component if it listens to activeModal
            activeModalId.value = highest.id
        }
        // Else: Keep showing current. Waits for current to close.
    }

    // --- Actions ---

    /**
     * 将一个弹窗任务推入队列
     */
    function openModal(
        component: string | object,
        props: Record<string, any> = {},
        priority: number = MODAL_PRIORITY.DEFAULT
    ): Promise<any> {
        return new Promise((resolve) => {
            const task: ModalTask = {
                id: generateId(),
                component,
                props,
                priority,
                resolve
            }
            queue.value.push(task)
            schedule()
        })
    }

    /**
     * 关闭当前弹窗 (或指定 ID)
     * 必须由弹窗组件内部调用 (emit('close') -> store.close())
     */
    function closeModal(id?: string) {
        const targetId = id || activeModalId.value
        if (!targetId) return

        const taskIndex = queue.value.findIndex(m => m.id === targetId)
        if (taskIndex !== -1) {
            const task = queue.value[taskIndex]

            // Resolve the promise if it exists
            if (task && task.resolve) task.resolve(true)

            // Remove from queue
            queue.value.splice(taskIndex, 1)

            // If we closed the active one, clear active ID to trigger next schedule
            if (activeModalId.value === targetId) {
                activeModalId.value = null
            }

            schedule()
        }
    }

    /**
     * 强制清空所有弹窗
     */
    function closeAll() {
        queue.value = []
        activeModalId.value = null
    }

    return {
        // State
        queue,
        activeModal,
        activeModalId,

        // Actions
        openModal,
        closeModal,
        closeAll,

        // Constants
        PRIORITY: MODAL_PRIORITY
    }
})()
