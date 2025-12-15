<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
import GridEditor from '~/components/GridEditor.vue'
import { list, currentTemplateId } from '~/logic/storage'
import { TEMPLATES } from '~/logic/templates'

const route = useRoute()
const id = route.params.id as string
const loading = ref(true)
const error = ref('')
const customTitle = ref('') // Local title state

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
        />
    </div>
    
    <Footer />
  </div>
</template>
