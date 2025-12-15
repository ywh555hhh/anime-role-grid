<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
import GuideModal from '~/components/GuideModal.vue'
import FirstTimeGuide from '~/components/FirstTimeGuide.vue'
import TrendingGuideModal from '~/components/TrendingGuideModal.vue'
import TemplateGalleryModal from '~/components/TemplateGalleryModal.vue'
import GridEditor from '~/components/GridEditor.vue' // Import Wrapper

import { list, name, currentTemplateId } from '~/logic/storage'
import { TEMPLATES } from '~/logic/templates'

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

// Template Logic
const currentTemplate = computed(() => 
  TEMPLATES.find(t => t.id === currentTemplateId.value) || TEMPLATES[0]!
)

// Auto-reset custom title
watch(currentTemplate, () => {
  name.value = ''
})

// Adapt to GridEditor format
const editorData = computed(() => ({
    title: currentTemplate.value.name,
    config: {
        cols: currentTemplate.value.cols,
        items: currentTemplate.value.items
    }
}))

function handleManualGuideOpen() {
  shouldShowTrendingAfterGuide.value = false
  showFirstTimeGuide.value = true
}

function selectTemplate(id: string) {
  currentTemplateId.value = id
  showTemplateModal.value = false
}

async function handleTrendingSelect(payload: { id: string, title: string }) {
  currentTemplateId.value = payload.id
  await nextTick()
  name.value = payload.title
  showTrendingGuide.value = false
}

function handleOpenGallery() {
  showTrendingGuide.value = false
  showTemplateModal.value = true
}

function handleResetTags() {
  if (!confirm('确定要重置当前模板的所有标签文字吗？(图片不会被清除)')) return
  const templateItems = currentTemplate.value.items
  const newList = list.value.map((item, index) => ({
    ...item,
    label: templateItems[index] || ''
  }))
  list.value = newList
}
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20">
    <Header />
    
    <div class="container mx-auto flex flex-col items-center gap-6 px-4 max-w-full">
        <!-- Unified Editor Component -->
        <GridEditor 
            mode="official"
            :template-data="editorData"
        >
            <!-- Slot: Extra Actions (Specific to Home) -->
            <template #extra-actions>
                 <!-- Guide Buttons -->
                 <div class="flex flex-col gap-2 mt-1 w-full items-center">
                    <div class="flex gap-4">
                        <button 
                        @click="showGuideModal = true"
                        class="text-xs font-bold text-gray-600 hover:text-[#e4007f] flex items-center gap-1.5 transition-colors group"
                        >
                        <div class="p-1 rounded bg-gray-100 group-hover:bg-pink-50 transition-colors">
                            <div class="i-carbon-help text-sm" />
                        </div>
                        <span>食用指南</span>
                        </button>

                        <button 
                        @click="handleManualGuideOpen"
                        class="text-xs font-bold text-gray-600 hover:text-[#e4007f] flex items-center gap-1.5 transition-colors group"
                        >
                        <div class="p-1 rounded bg-gray-100 group-hover:bg-pink-50 transition-colors">
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
                            class="flex items-center justify-center gap-2 bg-white border-2 border-black px-4 py-1.5 rounded-md text-sm font-bold min-w-[160px] transition-colors hover:border-[#e4007f] hover:text-[#e4007f] focus:outline-none"
                        >
                            <span>{{ currentTemplate.name }}</span>
                            <div i-carbon-chevron-right class="text-xs" />
                        </button>
                        </div>
                        
                        <button 
                            @click="handleResetTags"
                            class="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-100 hover:bg-[#e4007f] hover:text-white transition-colors text-xs font-bold"
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
    
    <Footer />
  </div>
</template>
