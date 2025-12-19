<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
import GuideModal from '~/components/GuideModal.vue'
import FirstTimeGuide from '~/components/FirstTimeGuide.vue'
import TrendingGuideModal from '~/components/TrendingGuideModal.vue'
import TemplateGalleryModal from '~/components/TemplateGalleryModal.vue'
import GridEditor from '~/components/GridEditor.vue' // Import Wrapper

import { useGridStore } from '~/stores/gridStore'
import { TEMPLATES } from '~/logic/templates'

// Store
const store = useGridStore()
const { loadTemplate, currentTitle, currentTemplateId, isStreamerMode } = store

// Modals
const showGuideModal = ref(false)
const showFirstTimeGuide = ref(false)
const showTrendingGuide = ref(false)
const shouldShowTrendingAfterGuide = ref(false)
const showTemplateModal = ref(false)

// Init Logic (First Time Guide)
if (typeof window !== 'undefined') {
  const today = new Date().toDateString()
  const lastShownDate = localStorage.getItem('lastGuideDate')

  if (lastShownDate !== today) {
    showFirstTimeGuide.value = true
    shouldShowTrendingAfterGuide.value = true
    localStorage.setItem('lastGuideDate', today)
  }
}

onMounted(() => {
  // Initialize with current or default
  // Integrity check handled by store? Or check here?
  const initialID = currentTemplateId.value || 'classic'
  
  // Ensure we load the official template structure
  // If ID is custom but we are on Home, we might want to reset to official?
  // Home is for Official. ViewTemplate is for Custom.
  // Actually Home supports switching official templates.
  if (initialID === 'custom' || !TEMPLATES.some(t => t.id === initialID)) {
      // If the persisted ID is invalid or 'custom' (legacy keyword), reset to default
      // If the persisted ID is invalid or 'custom' (legacy keyword), reset to default
      store.loadTemplate('classic')
  } else {
      store.loadTemplate(initialID)
  }
})

watch(showFirstTimeGuide, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    if (shouldShowTrendingAfterGuide.value) {
      setTimeout(() => {
        showTrendingGuide.value = true
        shouldShowTrendingAfterGuide.value = false 
      }, 300)
    }
  }
})

// Template Logic (for UI Display)
const currentTemplateName = computed(() => {
    return TEMPLATES.find(t => t.id === currentTemplateId.value)?.name || '默认模板'
})


function handleManualGuideOpen() {
  shouldShowTrendingAfterGuide.value = false
  showFirstTimeGuide.value = true
}

function selectTemplate(id: string) {
  loadTemplate(id)
  showTemplateModal.value = false
}

async function handleTrendingSelect(payload: { id: string, title: string }) {
  // Trending Select logic:
  // If it's an official template ID, switching to it is enough.
  // The 'title' payload is just for the user's custom title?
  // We need to implement 'setName' in store or just allow binding.
  await loadTemplate(payload.id)
  // TODO: Set custom title? The store exposes currentTitle ref which is writable.
  currentTitle.value = payload.title
  showTrendingGuide.value = false
}

function handleOpenGallery() {
  showTrendingGuide.value = false
  showTemplateModal.value = true
}

function handleResetTags() {
  if (!confirm('确定要重置当前模板的所有标签文字吗？(图片不会被清除)')) return
  const id = currentTemplateId.value
  const official = TEMPLATES.find(t => t.id === id)
  if (official) {
      // Create fresh items
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
                        @click="showGuideModal = true"
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
                            @click="showTemplateModal = true"
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

    <!-- Page Level Modals -->
    <FirstTimeGuide :show="showFirstTimeGuide" @close="showFirstTimeGuide = false" />
    <TrendingGuideModal 
      :show="showTrendingGuide" 
      @close="showTrendingGuide = false"
      @select="handleTrendingSelect"
      @open-gallery="handleOpenGallery"
    />
    <GuideModal :show="showGuideModal" @close="showGuideModal = false" />
    <TemplateGalleryModal 
      :show="showTemplateModal" 
      :current-id="currentTemplateId"
      @close="showTemplateModal = false"
      @select="selectTemplate"
    />
    
    <Footer v-if="!isStreamerMode" />
  </div>
</template>
