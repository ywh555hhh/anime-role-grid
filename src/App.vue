<script setup lang="ts">
import { ref, computed } from 'vue'
// import html2canvas from 'html2canvas'
import Header from '~/components/Header.vue'
import Grid from '~/components/Grid.vue'
import Search from '~/components/Search.vue'
import Footer from '~/components/Footer.vue'
import { list, name, currentTemplateId } from '~/logic/storage'
import { TEMPLATES } from '~/logic/templates'
import type { GridItemCharacter } from '~/types'

const showSearch = ref(false)
const currentSlotIndex = ref<number | null>(null)

const currentTemplate = computed(() => 
  TEMPLATES.find(t => t.id === currentTemplateId.value) || TEMPLATES[0]!
)

function handleSelectSlot(index: number) {
  currentSlotIndex.value = index
  showSearch.value = true
}

function handleAdd(character: GridItemCharacter) {
  const index = currentSlotIndex.value
  if (index === null) return
  
  const item = list.value[index]
  if (!item) return

  // Update the character in the selected slot
  item.character = character
  
  // Close search
  showSearch.value = false
  currentSlotIndex.value = null
}

const saving = ref(false)

async function handleSave() {
  // Target the HIDDEN export grid
  const element = document.getElementById('grid-export-target')
  if (!element || saving.value) return
  
  saving.value = true
  
  try {
    // Dynamic import
    let toPng
    try {
      const module = await import('html-to-image')
      toPng = module.toPng
    } catch (e) {
      console.error('Failed to load html-to-image:', e)
      alert('组件加载失败，请尝试重启开发服务器 (npm run dev)')
      return
    }

    // Wait a bit to ensure any pending renders/fetches in the hidden grid are done
    await new Promise(resolve => setTimeout(resolve, 500))

    const currentCols = currentTemplate.value.cols
    const targetWidth = currentCols * 120
    
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 3,
      cacheBust: true,
      width: targetWidth,
      skipOnError: true,
    } as any)
    
    const link = document.createElement('a')
    link.download = `anime-grid-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  } catch (error: any) {
    console.error('Export failed:', error)
    let msg = error.message || error
    if (Object.prototype.toString.call(error) === '[object Event]' && error.type === 'error') {
      msg = '资源加载失败 (可能是网络问题或图片跨域)'
    }
    alert(`图片生成失败: ${msg}`)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20">
    <!-- Header no longer needs search event, as search is triggered by grid slots -->
    <Header v-model:name="name" @search="() => {}" />
    
    <div class="container mx-auto flex flex-col items-center gap-6 px-4 max-w-full overflow-x-hidden">
      <!-- Live Interactive Grid (Responsive, Direct URLs) -->
      <Grid 
        id="grid-capture-target"
        :list="list" 
        :cols="currentTemplate.cols"
        @select-slot="handleSelectSlot"
      />

      <!-- Hidden Export Grid (Fixed Desktop Size, Proxy URLs) -->
      <!-- Positioned off-screen but rendered -->
      <div 
        class="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none"
        :style="{ width: `${currentTemplate.cols * 120}px` }"
      >
        <Grid 
          id="grid-export-target"
          :list="list" 
          :cols="currentTemplate.cols"
          :for-export="true"
        />
      </div>

      <div class="flex flex-col items-center gap-4">
        <button 
          class="px-8 py-3 bg-gray-900 text-white rounded-full text-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          :disabled="saving"
          @click="handleSave"
        >
          <div v-if="saving" i-carbon-circle-dash class="animate-spin text-xl" />
          <div v-else i-carbon-image class="text-xl" />
          <span>{{ saving ? '生成中...' : '保存高清图片' }}</span>
        </button>

        <!-- Template Switcher (Dropdown) -->
        <div class="flex items-center gap-2">
          <label for="template-select" class="text-sm text-gray-500 dark:text-gray-400">当前模板:</label>
          <div class="relative">
            <select
              id="template-select"
              v-model="currentTemplateId"
              class="appearance-none bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-1 pl-3 pr-8 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option v-for="template in TEMPLATES" :key="template.id" :value="template.id">
                {{ template.name }}
              </option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <div i-carbon-chevron-down class="text-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <Footer />

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="showSearch" 
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" 
        @click="showSearch = false" 
      />
    </Transition>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-10 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-10 opacity-0"
    >
      <Search
        v-if="showSearch"
        class="fixed left-1/2 top-20 z-50 -translate-x-1/2 w-[90%] max-w-5xl h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
        @add="handleAdd"
        @close="showSearch = false"
      />
    </Transition>
  </div>
</template>
