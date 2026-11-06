<script setup lang="ts">
import { computed, onMounted } from "vue";
import Header from "~/components/Header.vue";
import Footer from "~/components/Footer.vue";
import GuideModal from "~/components/GuideModal.vue";
import FirstTimeGuide from "~/components/FirstTimeGuide.vue";
import TemplateGalleryModal from "~/components/TemplateGalleryModal.vue";
import TrendingGuideModal from "~/components/TrendingGuideModal.vue";
import GridEditor from "~/components/GridEditor.vue";

import { useGridStore } from "~/stores/gridStore";
import { useModalStore, MODAL_PRIORITY } from "~/stores/modalStore"; // NEW
import { TEMPLATES } from "~/logic/templates";

// Store
const store = useGridStore();
const modalStore = useModalStore; // NEW
const { loadTemplate, currentTemplateId, isStreamerMode } = store;

// Init Logic (First Time Guide)
// Logic moved to onMounted and uses modalStore

import { tryShowTrending } from "~/logic/trendingTrigger";
import { canShow, markShown, markShownThisVisit } from "~/logic/growth";

// Init Logic
onMounted(() => {
    const initialID = currentTemplateId.value || "classic";
    if (initialID === "custom" || !TEMPLATES.some((t) => t.id === initialID)) {
        store.loadTemplate("classic");
    } else {
        store.loadTemplate(initialID);
    }

    // --- 入场自动弹窗 ---
    //
    // **同一次访问最多弹一个**。
    //
    // 之前这里是「每天第一次弹『大家都在填』，关掉它立刻链式弹『热门推荐』」——
    // 用户刚关掉一个弹窗又来一个，太打断。而且频控散在两个文件里
    // （localStorage.lastGuideDate / lastTrendingTime），两种粒度。
    //
    // 现在频控统一在 `~/logic/growth`：
    //   - 当天第一次进站 → 弹『大家都在填』（日历日粒度，跨零点就恢复）
    //   - 当天之后的访问 → 弹『热门推荐』（1 小时冷却）
    //   - **两者不再连弹**
    if (typeof window !== "undefined") {
        if (canShow("daily-picks")) {
            modalStore.openModal(
                FirstTimeGuide,
                {
                    // 引导里的「热门模板」按钮现在是真的会切换模板
                    onSelectTemplate: (templateId: string) => {
                        loadTemplate(templateId);
                    },
                    // 关闭不用传 onClose —— 调度器已经处理了 @close → closeModal()
                },
                MODAL_PRIORITY.GUIDE,
            );
            markShown("daily-picks");
            markShownThisVisit();
        } else {
            tryShowTrending();
        }
    }
});

// Template Logic (for UI Display)
const currentTemplateName = computed(() => {
    return TEMPLATES.find((t) => t.id === currentTemplateId.value)?.name || "默认模板";
});

function handleManualJoinGroup() {
    modalStore.openModal(
        FirstTimeGuide,
        {
            show: true,
            onClose: () => modalStore.closeModal(),
        },
        MODAL_PRIORITY.INTERACTION,
    );
}

function handleOpenTrending() {
    // 直接打开热门推荐，不需要冷却
    modalStore.openModal(
        TrendingGuideModal,
        {
            show: true,
            onClose: () => modalStore.closeModal(),
            onSelect: (payload: { id: string; title: string }) => {
                loadTemplate(payload.id);
                modalStore.closeModal();
            },
            onOpenGallery: () => {
                modalStore.closeModal();
                handleOpenGallery();
            },
        },
        MODAL_PRIORITY.INTERACTION,
    );
}

function selectTemplate(id: string) {
    loadTemplate(id);
    modalStore.closeModal(); // Close Gallery
}

// function selectTemplate removed due to duplication

function handleOpenGallery() {
    // Trigger specific logic: Click Switch Template -> Try Trending -> Fallback to Real Gallery
    tryShowTrending(() => {
        modalStore.openModal(
            TemplateGalleryModal,
            {
                show: true,
                currentId: currentTemplateId.value,
                onClose: () => modalStore.closeModal(),
                onSelect: selectTemplate,
            },
            MODAL_PRIORITY.INTERACTION,
        );
    });
}

function handleShowGuide() {
    modalStore.openModal(
        GuideModal,
        {
            show: true,
            onClose: () => modalStore.closeModal(),
        },
        MODAL_PRIORITY.INTERACTION,
    );
}

function handleResetTags() {
    if (!confirm("确定要重置当前模板的所有标签文字吗？(图片不会被清除)")) return;
    const id = currentTemplateId.value;
    const official = TEMPLATES.find((t) => t.id === id);
    if (official) {
        const newList = store.currentList.value.map((item, index) => ({
            ...item,
            label: official.items[index] || "",
        }));
        store.currentList.value = newList;
    }
}
</script>

<template>
    <div
        class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20"
    >
        <Header />

        <div class="container mx-auto flex flex-col items-center gap-6 px-4 max-w-full">
            <!-- Unified Editor Component -->
            <GridEditor @open-gallery="handleOpenGallery" @reset-tags="handleResetTags">
                <!-- Slot: Extra Actions (Specific to Home) -->
                <template #extra-actions>
                    <!-- Guide Buttons -->
                    <div class="flex flex-col gap-2 mt-1 w-full items-center">
                        <div class="flex gap-4">
                            <button
                                @click="handleShowGuide"
                                class="text-xs font-bold text-gray-600 hover:text-primary flex items-center gap-1.5 transition-colors group"
                            >
                                <div class="icon-btn group-hover:bg-primary-light">
                                    <div class="i-carbon-help text-sm" />
                                </div>
                                <span>食用指南</span>
                            </button>

                            <button
                                @click="handleOpenTrending"
                                class="text-xs font-bold text-gray-600 hover:text-primary flex items-center gap-1.5 transition-colors group"
                            >
                                <div class="icon-btn group-hover:bg-primary-light">
                                    <div class="i-carbon-fire text-sm" />
                                </div>
                                <span>大家都在填</span>
                            </button>

                            <button
                                @click="handleManualJoinGroup"
                                class="text-xs font-bold text-gray-600 hover:text-primary flex items-center gap-1.5 transition-colors group"
                            >
                                <div class="icon-btn group-hover:bg-primary-light">
                                    <div class="i-carbon-chat text-sm" />
                                </div>
                                <span>加群交流</span>
                            </button>
                        </div>

                        <!-- Template Switcher -->
                        <div class="flex flex-col items-center gap-3 w-full mt-2">
                            <div class="flex items-center gap-2">
                                <img src="/logo.png" class="w-5 h-5 object-contain" />
                                <label class="text-sm text-black font-bold">当前模板:</label>
                                <button
                                    @click="handleOpenGallery"
                                    class="btn flex items-center justify-center gap-2 bg-white border-2 border-black px-4 py-1.5 rounded-md text-sm font-bold min-w-[160px] transition-colors hover:border-primary hover:text-primary"
                                >
                                    <span>{{ currentTemplateName }}</span>
                                    <div i-carbon-chevron-right class="text-xs" />
                                </button>
                            </div>

                            <button
                                @click="handleResetTags"
                                class="btn flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-100 hover:bg-primary hover:text-white transition-colors text-xs font-bold"
                                title="将所有标签重置为默认值"
                            >
                                <div class="i-carbon-reset" />
                                <span>重置当前模板所有标签</span>
                            </button>
                        </div>
                    </div>
                </template>
            </GridEditor>
        </div>

        <!-- Page Level Modals REMOVED -> Managed by Global Dispatcher -->
        <!-- <FirstTimeGuide ... /> -->
        <!-- <TrendingGuideModal ... /> -->
        <!-- <GuideModal ... /> -->
        <!-- <TemplateGalleryModal ... /> -->

        <Footer v-if="!isStreamerMode" />
    </div>
</template>
