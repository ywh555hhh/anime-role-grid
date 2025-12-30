<script setup lang="ts">
import { computed, onMounted } from 'vue'
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
import GuideModal from '~/components/GuideModal.vue'
import FirstTimeGuide from '~/components/FirstTimeGuide.vue'
import TrendingGuideModal from '~/components/TrendingGuideModal.vue'
import TemplateGalleryModal from '~/components/TemplateGalleryModal.vue'
import GridEditor from '~/components/GridEditor.vue'

import { useGridStore } from '~/stores/gridStore'
import { useModalStore, MODAL_PRIORITY } from '~/stores/modalStore' // NEW
import { TEMPLATES } from '~/logic/templates'

// Store
const store = useGridStore()
const modalStore = useModalStore // NEW
const { loadTemplate, currentTitle, currentTemplateId, isStreamerMode } = store

// Init Logic (First Time Guide)
// Logic moved to onMounted and uses modalStore

onMounted(() => {
  // Initialize with current or default
  const initialID = currentTemplateId.value || 'classic'
  
  if (initialID === 'custom' || !TEMPLATES.some(t => t.id === initialID)) {
      store.loadTemplate('classic')
  } else {
      store.loadTemplate(initialID)
  }

  // --- Auto-Show Guides (Queue) ---
  if (typeof window !== 'undefined') {
    const today = new Date().toDateString()
    const lastShownDate = localStorage.getItem('lastGuideDate')

    if (lastShownDate !== today) {
        // 1. First Time Guide (Higher Priority in Guide chain)
        modalStore.openModal(FirstTimeGuide, {
            show: true, // Component expects 'show' prop?
            // Actually FirstTimeGuide usually has v-model or check.
            // Let's check FirstTimeGuide props. 
            // It has :show="showFirstTimeGuide" @close="...".
            // We pass onClose handler.
            onClose: () => modalStore.closeModal()
        }, MODAL_PRIORITY.GUIDE)

        // 2. Trending Guide (Slightly lower priority, shows after Guide closes)
        // We want it to show *after*. Queue logic handles this automatically!
        // Just push it now. 
        modalStore.openModal(TrendingGuideModal, {
            show: true,
            onClose: () => modalStore.closeModal(),
            onSelect: handleTrendingSelect,
            onOpenGallery: handleOpenGallery
        }, MODAL_PRIORITY.GUIDE - 10) // 290

        localStorage.setItem('lastGuideDate', today)
    }
  }
})

// Template Logic (for UI Display)
const currentTemplateName = computed(() => {
    return TEMPLATES.find(t => t.id === currentTemplateId.value)?.name || '默认模板'
})


function handleManualGuideOpen() {
  // Manually open Guide (Force show)
  // Use higher priority or just GUIDE? User action = INTERACTION.
  modalStore.openModal(FirstTimeGuide, {
      show: true,
      onClose: () => modalStore.closeModal()
  }, MODAL_PRIORITY.INTERACTION)
}

function selectTemplate(id: string) {
  loadTemplate(id)
  modalStore.closeModal() // Close Gallery
}

async function handleTrendingSelect(payload: { id: string, title: string }) {
  await loadTemplate(payload.id)
  currentTitle.value = payload.title
  modalStore.closeModal() // Close Trending
}

function handleOpenGallery() {
  // Close whatever (e.g. Trending) and show Gallery
  // Actually we can just push Gallery. If Trending is open (290), 
  // and we push Gallery (INTERACTION 500), it will preempt (swap).
  // Perfect!
  modalStore.openModal(TemplateGalleryModal, {
      show: true,
      currentId: currentTemplateId.value,
      onClose: () => modalStore.closeModal(),
      onSelect: selectTemplate
  }, MODAL_PRIORITY.INTERACTION)
}

function handleShowGuide() {
    modalStore.openModal(GuideModal, {
        show: true,
        onClose: () => modalStore.closeModal()
    }, MODAL_PRIORITY.INTERACTION)
}

function handleResetTags() {
  if (!confirm('确定要重置当前模板的所有标签文字吗？(图片不会被清除)')) return
  const id = currentTemplateId.value
  const official = TEMPLATES.find(t => t.id === id)
  if (official) {
      const newList = store.currentList.value.map((item, index) => ({
          ...item,
          label: official.items[index] || ''
      }))
      store.currentList.value = newList
  }
}
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20">
    <Header />
    
    <div class="container mx-auto flex flex-col items-center gap-6 px-4 max-w-full">
        <!-- Unified Editor Component -->
        <GridEditor 
            @open-gallery="handleOpenGallery"
            @reset-tags="handleResetTags"
        >
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
                        @click="handleManualGuideOpen"
                        class="text-xs font-bold text-gray-600 hover:text-primary flex items-center gap-1.5 transition-colors group"
                        >
                        <div class="icon-btn group-hover:bg-primary-light">
                            <div class="i-carbon-bullhorn text-sm" />
                        </div>
                        <span>加入组织</span>
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
