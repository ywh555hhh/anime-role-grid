import { describe, it, expect, beforeEach } from "vitest";
import { useModalStore, MODAL_PRIORITY } from "~/stores/modalStore";

/**
 * 弹窗调度器的回归测试
 * ====================
 *
 * 「弹窗机制」是这个项目里最容易改坏、又最难手动测的部分：
 * 优先级、排队、抢占都藏在 store 里。
 *
 * 注意：**抢占路径（高优先级打断低优先级）目前有已知缺陷** ——
 * 被抢占的弹窗的 Promise 永远不会 resolve，调用方 await 会永久挂起。
 * 这里**只测不涉及抢占的路径**，不去给有 bug 的行为背书。
 * 缺陷记录见 docs/Pitfalls.md。
 */
const DummyModal = { name: "DummyModal" };
const OtherModal = { name: "OtherModal" };

/**
 * 注意：queue 是 ref，Vue 会把数组**深度响应式化**，
 * 所以 `queue.value[0].component` 拿到的是 Proxy，不是原对象。
 * 用 toBe 比较引用会永远失败 —— 这里按组件名比较。
 */
function activeName(store: typeof useModalStore): string | undefined {
    const component = store.activeModal.value?.component;
    if (!component) return undefined;
    return typeof component === "string" ? component : (component as { name?: string }).name;
}

describe("弹窗调度器", () => {
    beforeEach(() => {
        useModalStore.closeAll();
    });

    it("打开后成为当前弹窗", () => {
        const store = useModalStore;
        void store.openModal(DummyModal, { show: true });
        expect(store.activeModalId.value).not.toBeNull();
        expect(activeName(store)).toBe("DummyModal");
    });

    it("关闭后没有弹窗", () => {
        const store = useModalStore;
        void store.openModal(DummyModal, { show: true });
        store.closeModal();
        expect(store.activeModalId.value).toBeNull();
        expect(store.activeModal.value).toBeNull();
    });

    it("关掉一个会露出下一个", () => {
        const store = useModalStore;
        void store.openModal(DummyModal, { show: true });
        void store.openModal(OtherModal, { show: true });

        expect(store.queue.value).toHaveLength(2);
        store.closeModal();
        // 队列里还剩一个，且它成为当前
        expect(store.queue.value).toHaveLength(1);
        expect(store.activeModalId.value).not.toBeNull();
    });

    it("优先级高的先显示", () => {
        const store = useModalStore;
        // 先开一个低优先级的占位，再开高优先级 —— 但高优先级要插队
        void store.openModal(OtherModal, { show: true }, MODAL_PRIORITY.PROMOTION);
        void store.openModal(DummyModal, { show: true }, MODAL_PRIORITY.SYSTEM);

        expect(activeName(store)).toBe("DummyModal");
    });

    it("props 会原样带出去", () => {
        const store = useModalStore;
        void store.openModal(DummyModal, { show: true, currentId: "abc" });
        expect(store.activeModal.value?.props).toEqual({ show: true, currentId: "abc" });
    });

    it("closeAll 清空一切", () => {
        const store = useModalStore;
        void store.openModal(DummyModal, { show: true });
        void store.openModal(OtherModal, { show: true });
        store.closeAll();

        expect(store.queue.value).toHaveLength(0);
        expect(store.activeModalId.value).toBeNull();
    });

    it("closeModal 可以按 id 关掉队列里的某个", () => {
        const store = useModalStore;
        void store.openModal(DummyModal, { show: true });
        void store.openModal(OtherModal, { show: true });

        const targetId = store.queue.value.find(
            (m) => (m.component as { name: string }).name === "OtherModal",
        )?.id;
        expect(targetId).toBeDefined();
        store.closeModal(targetId!);

        expect(
            store.queue.value.some((m) => (m.component as { name: string }).name === "OtherModal"),
        ).toBe(false);
        expect(
            store.queue.value.some((m) => (m.component as { name: string }).name === "DummyModal"),
        ).toBe(true);
    });

    it("关掉不存在的 id 不会出事", () => {
        const store = useModalStore;
        expect(() => store.closeModal("__not_exist__")).not.toThrow();
    });
});
