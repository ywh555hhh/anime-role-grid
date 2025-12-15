<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
import GridEditor from '~/components/GridEditor.vue'
import GuideModal from '~/components/GuideModal.vue'
import FirstTimeGuide from '~/components/FirstTimeGuide.vue'
import { list, currentTemplateId } from '~/logic/storage'
import { TEMPLATES } from '~/logic/templates'

const route = useRoute()
const id = route.params.id as string
const loading = ref(true)
const error = ref('')
const customTitle = ref('') // Local title state
const showGuideModal = ref(false)
const showFirstTimeGuide = ref(false)

function handleResetTags() {
  if (!confirm('确定要重置当前模板的所有标签文字吗？(图片不会被清除)')) return
  if (!templateData.value) return
  
  const templateItems = templateData.value.config.items
  const newList = list.value.map((item, index) => ({
    ...item,
    label: templateItems[index] || ''
  }))
  list.value = newList
}

const templateData = ref<{
  type: string
  title: string
  config: {
    cols: number
    items: string[]
    creator?: string
  }
} | null>(null)

onMounted(async () => {
  try {
    const res = await fetch(`/api/template/${id}`)
    if (!res.ok) throw new Error('模版不存在或已删除')
    templateData.value = await res.json()
    
    // Init Storage
    if (templateData.value) {
        // 1. Set ID First
        currentTemplateId.value = 'custom' 
        
        // Initialize local title with User's Main Title (so it's not empty)
        customTitle.value = templateData.value.title
        
        // 2. Populate list
        list.value = templateData.value.config.items.map(label => ({
            label,
            character: undefined
        }))
    }
  } catch (e: any) {
    console.error(e)
    error.value = e.message
    alert(`加载出错: ${e.name}: ${e.message}\n${e.stack || ''}`)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
    // Reset to default template to avoid pollution
    if (currentTemplateId.value === 'custom') {
        const defaultId = TEMPLATES[0]?.id || '2024_general-anime'
        currentTemplateId.value = defaultId
    }
    // No need to clear customTitle here as it is local ref
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20">
    <Header />
    
    <div class="container mx-auto flex flex-col items-center gap-6 px-4 max-w-full">
         <GridEditor 
            mode="custom" 
            :template-data="templateData" 
            v-model:customTitle="customTitle"
            :loading="loading" 
            :error="error"
        >
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
                        @click="showFirstTimeGuide = true"
                        class="text-xs font-bold text-gray-600 hover:text-[#e4007f] flex items-center gap-1.5 transition-colors group"
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
                            <span>{{ templateData?.title }}</span>
                        </div>
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
    
    <Footer />
    
    <!-- Modals -->
    <GuideModal :show="showGuideModal" @close="showGuideModal = false" />
    <FirstTimeGuide :show="showFirstTimeGuide" @close="showFirstTimeGuide = false" />
  </div>
</template>
