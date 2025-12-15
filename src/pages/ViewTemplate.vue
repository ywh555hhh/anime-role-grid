<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Header from '~/components/Header.vue'
import Grid from '~/components/Grid.vue'
import Search from '~/components/Search.vue'
import Footer from '~/components/Footer.vue'
import { list, name as customTitle, currentTemplateId } from '~/logic/storage'
import { exportGridAsImage } from '~/logic/export'
import { useVideoExport } from '~/logic/video-export'
import VideoExportModal from '~/components/VideoExportModal.vue'
import VideoSuccessModal from '~/components/VideoSuccessModal.vue'
// Removed unused JoinGroupModal

const route = useRoute()
const router = useRouter()
const id = route.params.id as string
const loading = ref(true)
const error = ref('')

const templateData = ref<{
  type: string
  title: string
  config: {
    cols: number
    items: string[]
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
        // Init List
        list.value = templateData.value.config.items.map(label => ({
            label,
            character: undefined
        }))
        // Set ID to generic 'custom' to avoid template logic errors, 
        // or we could use the actual ID if we update storage logic.
        // For now, let's keep currentTemplateId as is (it might default to standard), 
        // but Grid uses passed props mostly.
        currentTemplateId.value = 'custom' 
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

// Reuse Logic
const showSearch = ref(false)
const showShareModal = ref(false)
const showCharacterName = ref(false)
const currentSlotIndex = ref<number | null>(null)
const saving = ref(false)
const generatedImage = ref('')
const canShare = (typeof navigator !== 'undefined' && 'share' in navigator)

function handleSelectSlot(index: number) {
  currentSlotIndex.value = index
  showSearch.value = true
}

function handleAdd(character: any) {
  const index = currentSlotIndex.value
  if (index === null) return
  const newList = [...list.value]
  if (!newList[index]) newList[index] = { label: templateData.value?.config.items[index] || '', character: undefined }
  newList[index] = { ...newList[index], character }
  list.value = newList
  showSearch.value = false
  currentSlotIndex.value = null
}

function handleClear() {
    const index = currentSlotIndex.value
    if (index === null) return;
    const newList = [...list.value];
    if (newList[index]) {
        newList[index] = { ...newList[index], character: undefined };
        list.value = newList;
    }
    showSearch.value = false;
    currentSlotIndex.value = null;
}

async function handleSave() {
  if (saving.value) return
  saving.value = true
  try {
    generatedImage.value = await exportGridAsImage(
        list.value, 
        'custom_ugc', // Special ID for export logic
        customTitle.value, 
        'anime-grid', 
        showCharacterName.value,
        templateData.value?.config 
    )
    showShareModal.value = true
  } catch (e: any) {
    alert('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function handleShare() {
     if (canShare) {
        try {
            const blob = await (await fetch(generatedImage.value)).blob()
            const file = new File([blob], 'grid.png', { type: 'image/png' })
            await navigator.share({ files: [file] })
        } catch {}
    }
    showShareModal.value = false
}

// Video
const { isModalOpen: isVideoModalOpen, isSuccessModalOpen, isExporting, progress, statusText, lastExportFormat, generateVideo } = useVideoExport()
function handleVideoExport(settings: any) {
   if (!templateData.value) return
   generateVideo(list.value, templateData.value.config.items, { ...settings, showName: showCharacterName.value })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20">
    <Header />
    
    <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin i-carbon-circle-dash text-4xl text-[#e4007f]"></div>
    </div>

    <div v-else-if="error" class="text-center py-20">
        <h2 class="text-2xl font-bold mb-4">😢 {{ error }}</h2>
        <button @click="router.push('/')" class="px-6 py-2 bg-[#e4007f] text-white rounded-full">返回首页</button>
    </div>

    <div v-else class="container mx-auto flex flex-col items-center gap-6 px-4 max-w-full">
       <!-- Template Header -->
       <div class="text-center animate-fade-in-up">
           <div class="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-bold mb-2 border border-purple-200">
               <div i-carbon-user-avatar-filled />
               网友自制模版
           </div>
           <h1 class="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">{{ templateData?.title }}</h1>
       </div>

      <div class="relative w-full"> 
          <Grid 
            id="grid-capture-target"
            :list="list" 
            :cols="templateData?.config.cols || 3"
            :title="''"
            :default-title="templateData?.title"
            v-model:customTitle="customTitle"
            @select-slot="handleSelectSlot"
            :show-character-name="showCharacterName"
        />
      </div>

       <!-- Action Buttons -->
       <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
           <button 
              @click="handleSave"
              class="flex-1 py-3 bg-[#e4007f] text-white rounded-xl font-bold shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 transition-transform hover:-translate-y-1"
            >
              <div v-if="saving" class="i-carbon-circle-dash animate-spin" />
              <div v-else class="i-carbon-image" />
              保存图片
            </button>
            
            <button 
              @click="router.push('/create')"
              class="flex-1 py-3 bg-white border-2 border-[#e4007f] text-[#e4007f] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-pink-50 transition-colors"
            >
              <div class="i-carbon-add-alt" />
              我也要出题
            </button>
       </div>
    </div>
    
    <Footer />

    <Transition>
      <Search
        v-if="showSearch"
        class="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-5xl h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
        @add="handleAdd"
        @clear="handleClear"
        @close="showSearch = false"
      />
    </Transition>
    
    <VideoExportModal v-model="isVideoModalOpen" :loading="isExporting" :progress="progress" :status-text="statusText" @start-export="handleVideoExport" />
    <VideoSuccessModal :show="isSuccessModalOpen" :format="lastExportFormat" @close="isSuccessModalOpen = false" />

    <!-- Share Modal -->
    <div v-if="showShareModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" @click="showShareModal = false">
        <div class="bg-white p-6 rounded-2xl max-w-sm w-full" @click.stop>
            <img :src="generatedImage" class="w-full rounded shadow-md mb-4" />
            <button @click="handleShare" class="w-full py-3 bg-[#e4007f] text-white rounded-xl font-bold">分享图片</button>
        </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out;
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
