import { useModalStore, MODAL_PRIORITY } from "~/stores/modalStore";
import TrendingGuideModal from "~/components/TrendingGuideModal.vue";
import TemplateGalleryModal from "~/components/TemplateGalleryModal.vue";
import { useGridStore } from "~/stores/gridStore";
import { canShow, markShown, markShownThisVisit } from "~/logic/growth";

/**
 * 热门模板推荐
 * ==============
 *
 * ## 频控不在这里
 * 频控交给 `~/logic/growth`（一小时一次），这里只负责「弹什么、点了之后干什么」。
 *
 * 之前这个文件和 Home.vue **各有一套频控** —— 两个 localStorage key、
 * 两种粒度（天 / 小时）、两个地方。而且 FirstTimeGuide 关闭后还会
 * 立刻链式调过来，于是用户刚关掉一个弹窗又来一个。
 *
 * 现在统一到 growth.ts，且**同一次访问最多一个自动弹窗**。
 *
 * ## 优先级
 * 用 `MODAL_PRIORITY.PROMOTION`（100）：它是运营推广，
 * 优先级低于用户主动触发的弹窗（INTERACTION）和系统通知（SYSTEM），
 * 高于普通排队（DEFAULT）。
 * —— 之前这里注释里写着「用 PROMOTION 还是 GUIDE？GUIDE-10 = 290？」，
 * 摇摆了很久。现在定了：**它不是引导，是推广**，所以是 PROMOTION。
 */
export function tryShowTrending(fallback?: () => void) {
    if (typeof window === "undefined") return;

    // 冷却中：安静地什么都不做（或者交给调用方给的 fallback）
    if (!canShow("trending-picks")) {
        fallback?.();
        return;
    }

    const modalStore = useModalStore;
    const gridStore = useGridStore();

    modalStore.openModal(
        TrendingGuideModal,
        {
            show: true,
            // Wiring events
            // 关闭不用传 onClose —— 调度器已经处理了 @close → closeModal()

            onSelect: async (payload: { id: string; title: string }) => {
                await gridStore.loadTemplate(payload.id);
                gridStore.currentTitle.value = payload.title;
                modalStore.closeModal();
            },

            onOpenGallery: () => {
                // User clicked "More" -> Go to real gallery
                modalStore.closeModal();
                // Open Gallery (Standard flow)
                modalStore.openModal(
                    TemplateGalleryModal,
                    {
                        show: true,
                        currentId: gridStore.currentTemplateId.value,
                        onSelect: (id: string) => {
                            gridStore.loadTemplate(id);
                            modalStore.closeModal();
                        },
                    },
                    MODAL_PRIORITY.INTERACTION,
                );
            },
        },
        MODAL_PRIORITY.PROMOTION,
    );

    // 弹了才算 —— 冷却时间从「真的弹出来」这一刻开始算
    markShown("trending-picks");
    markShownThisVisit();
}
