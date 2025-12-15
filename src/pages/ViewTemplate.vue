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

import { onUnmounted } from 'vue'
import { TEMPLATES } from '~/logic/templates'

onUnmounted(() => {
    // Reset to default template to avoid pollution
    if (currentTemplateId.value === 'custom') {
        const defaultId = TEMPLATES[0]?.id || '2024_general-anime'
        currentTemplateId.value = defaultId
    }
    customTitle.value = ''
    // list.value = [] // Optional: clear list? Maybe safer not to if user goes back?
})

// Reuse Logic
const showSearch = ref(false)
const showShareModal = ref(false)
const showCharacterName = ref(false)
const currentSlotIndex = ref<number | null>(null)
const saving = ref(false)
const generatedImage = ref('')
const fillerName = ref('')
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
           
           <div v-if="templateData?.config.creator" class="text-sm text-gray-400 mt-1 font-bold">
               出题人: {{ templateData.config.creator }}
           </div>

           <!-- Filler Name Input -->
           <div class="mt-4 flex justify-center">
               <input 
                 v-model="fillerName" 
                 placeholder="填表人昵称 (可选)" 
                 class="text-center bg-transparent border-b border-gray-300 focus:border-pink-500 outline-none py-1 text-gray-600 font-bold placeholder-gray-300"
               />
           </div>
       </div>

      <div class="relative w-full flex flex-col items-center gap-2"> 
          <Grid 
            id="grid-capture-target"
            :list="list" 
            :cols="Number(templateData?.config.cols) || 3"
            :title="''"
            :default-title="templateData?.title"
            v-model:customTitle="customTitle"
            @select-slot="handleSelectSlot"
            :show-character-name="showCharacterName"
        />

         <!-- View Options -->
         <div class="flex items-center gap-4 mt-2">
            <button 
              class="flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all font-bold text-sm"
              :class="showCharacterName ? 'bg-[#e4007f] text-white border-[#e4007f]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#e4007f]'"
              @click="showCharacterName = !showCharacterName"
            >
              <div :class="showCharacterName ? 'i-carbon-checkbox-checked' : 'i-carbon-checkbox'" class="text-lg" />
              <span>显示角色名字</span>
            </button>
         </div>
      </div>

       <!-- Action Buttons -->
       <div class="flex flex-col items-center gap-4 w-full max-w-md mt-4">
           <button 
              @click="handleSave"
              class="px-10 py-3 bg-[#e4007f] text-white rounded-full text-lg font-bold hover:bg-[#c0006b] transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:shadow-pink-500/30 transform hover:-translate-y-1 w-full"
              :disabled="saving"
            >
              <div v-if="saving" class="i-carbon-circle-dash animate-spin text-xl" />
              <div v-else class="i-carbon-image text-xl" />
              <span>{{ saving ? '生成中...' : '保存高清图片' }}</span>
            </button>
            
            <button 
              @click="router.push('/create')"
              class="w-full py-3 bg-white border-2 border-[#e4007f] text-[#e4007f] rounded-full text-lg font-bold flex items-center justify-center gap-2 hover:bg-pink-50 transition-colors shadow-md hover:shadow-lg"
            >
              <div class="i-carbon-add-alt text-xl" />
              <span>我也要出题</span>
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

    <!-- Share Modal (Aligned with Home.vue) -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="showShareModal" 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" 
        @click="showShareModal = false"
      >
        <div 
          class="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full transform transition-all border-2 border-[#e4007f]" 
          @click.stop
        >
          <div class="w-full mb-4 flex items-center justify-center">
            <img 
              v-if="generatedImage"
              :src="generatedImage" 
              class="w-full h-auto max-h-[50vh] object-contain rounded-lg shadow-sm border border-gray-100" 
              alt="Generated Grid"
            />
            <div v-else class="w-32 h-32 mx-auto animate-bounce-low">
               <!-- Placeholder or Loading State if needed, currently reusing logic -->
               <div class="text-6xl">🎉</div>
            </div>
          </div>
          <h3 class="text-2xl font-bold mb-2 text-gray-900" style="font-family: 'Noto Serif SC', serif;">图片生成成功！</h3>
          <p class="text-gray-600 mb-8 font-medium">
            已尝试保存到相册。<br/>
            <span class="text-sm text-gray-500">如果未自动保存，请长按上方图片手动保存哦~</span>
          </p>
          
          <div class="flex flex-col gap-3">
            <button 
              @click="handleShare" 
              class="w-full px-6 py-3 bg-[#e4007f] text-white rounded-xl font-bold hover:bg-[#c0006b] transition-colors shadow-lg hover:shadow-pink-500/30 flex items-center justify-center gap-2"
            >
              <div v-if="canShare" i-carbon-share />
              <span>{{ canShare ? '调用系统分享' : '好的，我去分享' }}</span>
            </button>
            
            <button
                @click="showShareModal = false"
                class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all"
            >
                关闭
            </button>
          </div>
        </div>
      </div>
    </Transition>
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
