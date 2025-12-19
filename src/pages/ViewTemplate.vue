<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
import GridEditor from '~/components/GridEditor.vue'
import GuideModal from '~/components/GuideModal.vue'
import FirstTimeGuide from '~/components/FirstTimeGuide.vue'
import TemplateStats from '~/components/TemplateStats.vue' // Switched component

import { useGridStore } from '~/stores/gridStore'


const route = useRoute()
const id = route.params.id as string
const store = useGridStore()
const { loadTemplate, currentTitle, currentConfig, currentList } = store

const error = ref('')
const showGuideModal = ref(false)
const showFirstTimeGuide = ref(false)

function handleResetTags() {
  if (!confirm('确定要重置当前模板的所有标签文字吗？(图片不会被清除)')) return
  const defaults = currentConfig.value?.items || []
  const newList = currentList.value.map((item, index) => ({
      ...item,
      label: defaults[index] || ''
  }))
  currentList.value = newList
}

// Watch for route changes (e.g. switching templates via link)
watch(() => route.params.id, (newId) => {
    if (newId) loadTemplate(newId as string)
})

onMounted(async () => {
  try {
      if (!id) throw new Error('No ID provided')
      await loadTemplate(id)
  } catch (e: any) {
    console.error(e)
    error.value = e.message
    alert(`加载出错: ${e.message}`)
  }
})

onUnmounted(() => {
    // Reset to default on leave
    loadTemplate('classic')
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20">
    <Header />
    
    <div class="container mx-auto flex flex-col items-center gap-6 px-4 max-w-full">
         <GridEditor 
            v-model:customTitle="currentTitle"
            :error="error"
        >
            <template #extra-actions>
                 <!-- Voting Tip -->
                 <div class="w-full bg-pink-50 border border-pink-100 rounded-lg p-3 mb-4 flex items-center gap-3 animate-pulse-slow">
                     <div class="p-1.5 bg-primary rounded-full text-white shrink-0">
                         <div class="i-carbon-thumbs-up text-sm" />
                     </div>
                     <div class="flex-1">
                         <div class="text-xs font-bold text-primary">应援小贴士:</div>
                         <div class="text-[10px] text-gray-500 font-bold">点击<span class="mx-0.5 text-primary">“保存并生成图片”</span>即可自动为你的真爱投出一票！</div>
                     </div>
                 </div>

                 <!-- Guide Buttons -->
                 <div class="flex flex-col gap-2 mt-1 w-full items-center">
                    <div class="flex gap-4">
                        <button 
                        @click="showGuideModal = true"
                        class="text-xs font-bold text-gray-600 hover:text-primary flex items-center gap-1.5 transition-colors group"
                        >
                        <div class="p-1 rounded bg-gray-100 group-hover:bg-pink-50 transition-colors">
                            <div class="i-carbon-help text-sm" />
                        </div>
                        <span>食用指南</span>
                        </button>

                        <button 
                        @click="showFirstTimeGuide = true"
                        class="text-xs font-bold text-gray-600 hover:text-primary flex items-center gap-1.5 transition-colors group"
                        >
                        <div class="p-1 rounded bg-gray-100 group-hover:bg-pink-50 transition-colors">
                            <div class="i-carbon-bullhorn text-sm" />
                        </div>
                        <span>加入组织</span>
                        </button>
                    </div>

                    <!-- Template Info (Read Only) & Reset -->
                    <div class="flex flex-col items-center gap-3 w-full mt-2">
                        <div class="flex items-center gap-2">
                        <img src="/logo.png" class="w-5 h-5 object-contain" />
                        <label class="text-sm text-black font-bold">当前模板:</label>
                        <div
                            class="flex items-center justify-center gap-2 bg-gray-50 border-2 border-gray-200 px-4 py-1.5 rounded-md text-sm font-bold min-w-[160px] text-gray-500 cursor-not-allowed"
                        >
                            <span>{{ currentTitle }}</span>
                        </div>
                        </div>
                        
                        <button 
                            @click="handleResetTags"
                            class="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-100 hover:bg-primary hover:text-white transition-colors text-xs font-bold"
                            title="将所有标签重置为默认值"
                        >
                            <div class="i-carbon-reset" />
                            <span>重置当前模板所有标签</span>
                        </button>
                    </div>
                </div>
            </template>
        </GridEditor>
        <TemplateStats />
    </div>
    
    <Footer />
    
    <!-- Modals -->
    <GuideModal :show="showGuideModal" @close="showGuideModal = false" />
    <FirstTimeGuide :show="showFirstTimeGuide" @close="showFirstTimeGuide = false" />
  </div>
</template>
