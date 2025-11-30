<script setup lang="ts">
import { ref, computed } from 'vue'
import { onClickOutside } from '@vueuse/core'
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

// Dropdown Logic
const isDropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

onClickOutside(dropdownRef, () => {
  isDropdownOpen.value = false
})

function selectTemplate(id: string) {
  currentTemplateId.value = id
  isDropdownOpen.value = false
}

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
  
  // Create a shallow copy of the list to trigger the setter
  const newList = [...list.value]
  if (!newList[index]) return

  // Update the character in the selected slot
  newList[index] = {
    ...newList[index],
    character
  }
  
  // Trigger the computed setter in storage.ts
  list.value = newList
  
  // Close search
  showSearch.value = false
  currentSlotIndex.value = null
}

const saving = ref(false)

import { exportGridAsImage } from '~/logic/export'

// ...

async function handleSave() {
  if (saving.value) return
  saving.value = true
  
  try {
    await exportGridAsImage('grid-export-target', 'anime-grid')
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
    <!-- Header no longer needs search event or name prop -->
    <Header />
    
    <div class="container mx-auto flex flex-col items-center gap-6 px-4 max-w-full">
      <!-- Live Interactive Grid (Responsive, Direct URLs) -->
      <Grid 
        id="grid-capture-target"
        :list="list" 
        :cols="currentTemplate.cols"
        :title="currentTemplate.name"
        v-model:customTitle="name"
        @select-slot="handleSelectSlot"
      />

      <!-- Hidden Export Grid (Fixed Desktop Size, Proxy URLs) -->
      <!-- Positioned off-screen but rendered -->
      <div 
        class="fixed top-0 left-[-9999px] pointer-events-none"
        :style="{ width: `${currentTemplate.cols * 120}px` }"
      >
        <Grid 
          id="grid-export-target"
          :list="list" 
          :cols="currentTemplate.cols"
          :title="currentTemplate.name"
          :custom-title="name"
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
          <img src="/logo.png" class="w-5 h-5 object-contain" />
          <label for="template-select" class="text-sm text-black font-bold">当前模板:</label>
          <div class="relative" ref="dropdownRef">
            <!-- Trigger Button -->
            <button
              @click="isDropdownOpen = !isDropdownOpen"
              class="flex items-center justify-center gap-2 bg-white border-2 border-black px-4 py-1 rounded-md text-sm font-bold min-w-[160px] transition-colors hover:border-[#e4007f] focus:outline-none"
              :class="{ 'border-[#e4007f] text-[#e4007f]': isDropdownOpen }"
            >
              <span>{{ currentTemplate.name }}</span>
              <div 
                i-carbon-chevron-down 
                class="text-xs transition-transform duration-200" 
                :class="{ 'rotate-180': isDropdownOpen }" 
              />
            </button>

            <!-- Dropdown Menu -->
            <Transition
              enter-active-class="transition duration-100 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-75 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <div 
                v-if="isDropdownOpen"
                class="absolute top-full left-0 w-full mt-1 bg-white border-2 border-black rounded-md shadow-xl overflow-hidden z-20 flex flex-col"
              >
                <button
                  v-for="template in TEMPLATES" 
                  :key="template.id"
                  @click="selectTemplate(template.id)"
                  class="px-2 py-2 text-sm font-bold text-center cursor-pointer hover:bg-pink-50 hover:text-[#e4007f] transition-colors border-b border-gray-100 last:border-none"
                  :class="{ 'bg-pink-50 text-[#e4007f]': currentTemplateId === template.id }"
                >
                  {{ template.name }}
                </button>
              </div>
            </Transition>
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
