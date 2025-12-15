<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
import GridEditor from '~/components/GridEditor.vue'
import { list, name as customTitle, currentTemplateId } from '~/logic/storage'
import { TEMPLATES } from '~/logic/templates'

const route = useRoute()
// const router = useRouter() // Unused
const id = route.params.id as string
const loading = ref(true)
const error = ref('')

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
        customTitle.value = templateData.value.title
        // IMPORTANT: Reset list completely first to avoid pollution from previous larger templates
        list.value = [] 
        
        // Init List
        list.value = templateData.value.config.items.map(label => ({
            label,
            character: undefined
        }))
        // Set ID to generic 'custom'
        currentTemplateId.value = 'custom' 
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
    customTitle.value = ''
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20">
    <Header />
    
    <div class="container mx-auto flex flex-col items-center gap-6 px-4 max-w-full">
         <GridEditor 
            mode="custom" 
            :template-data="templateData" 
            :loading="loading" 
            :error="error"
        />
    </div>
    
    <Footer />
  </div>
</template>
