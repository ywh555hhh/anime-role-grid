<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Grid from '~/components/Grid.vue'
import Search from '~/components/Search.vue'
import VideoExportModal from '~/components/VideoExportModal.vue'
import VideoSuccessModal from '~/components/VideoSuccessModal.vue'
import JoinGroupModal from '~/components/JoinGroupModal.vue'
import { list, name as customTitle, currentTemplateId } from '~/logic/storage'
import { exportGridAsImage } from '~/logic/export'
import { useVideoExport } from '~/logic/video-export'

const props = defineProps<{
  mode: 'official' | 'custom'
  templateData: {
    title: string
    config: {
      cols: number
      items: string[]
      creator?: string
    }
  } | null
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'open-gallery'): void
  (e: 'reset-tags'): void
}>()

const router = useRouter()

// Local State
const showSearch = ref(false)
const showShareModal = ref(false)
const showJoinGroupModal = ref(false)
const showCharacterName = ref(false)
const currentSlotIndex = ref<number | null>(null)
const fillerName = ref('') // For custom mode

// Reuse Logic
const saving = ref(false)
const generatedImage = ref('')
const canShare = (typeof navigator !== 'undefined' && 'share' in navigator)

// --- Grid Interaction ---

function handleSelectSlot(index: number) {
  currentSlotIndex.value = index
  showSearch.value = true
}

function handleAdd(character: any) {
  const index = currentSlotIndex.value
  if (index === null) return
  
  const newList = [...list.value]
  // Ensure slot exists
  if (!newList[index]) {
      // Should not happen if list is init correctly, but safety check
      newList[index] = { label: props.templateData?.config?.items?.[index] || '', character: undefined }
  }
  
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

function handleUpdateLabel(payload: { index: number, label: string }) {
  // Only for Official mode usually, but maybe useful for custom too?
  // Home.vue allows editing labels. ViewTemplate.vue currently doesn't (Grid calls it but maybe we didn't hook it up)
  // Let's support it if the Grid emits it.
  const { index, label } = payload
  const newList = [...list.value]
  if (!newList[index]) return
  newList[index] = { ...newList[index], label }
  list.value = newList
}

// --- Export Logic ---

async function handleSave() {
  if (saving.value) return
  saving.value = true
  try {
    // If official, we might want to do the analytics fetch call here too?
    // Home.vue had a fetch('/api/save')... let's duplicate it or abstract it?
    // For now, let's keep it simple: Image Generation. 
    // If we want strict parity, we should emit an event 'save' and let parent handle analytics?
    // Or just do it here. Analytics is good.
    
    // Config object for Draw
    const exportConfig = {
        cols: Number(props.templateData?.config.cols) || 3,
        creator: props.templateData?.config.creator,
        filler: fillerName.value
    }

    generatedImage.value = await exportGridAsImage(
        list.value, 
        currentTemplateId.value, 
        customTitle.value, 
        'anime-grid', 
        showCharacterName.value,
        exportConfig
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
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file] })
                return
            }
        } catch {}
    }
    showShareModal.value = false // Fallback
}

// --- Video Logic ---
const { isModalOpen: isVideoModalOpen, isSuccessModalOpen, isExporting, progress, statusText, lastExportFormat, generateVideo } = useVideoExport()
function handleVideoExport(settings: any) {
   if (!props.templateData) return
   generateVideo(list.value, props.templateData.config.items, { ...settings, showName: showCharacterName.value })
}

</script>

<template>
  <div class="w-full flex flex-col items-center">
    
    <!-- Loading / Error States -->
    <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin i-carbon-circle-dash text-4xl text-[#e4007f]"></div>
    </div>

    <div v-else-if="error" class="text-center py-20">
        <h2 class="text-2xl font-bold mb-4">😢 {{ error }}</h2>
        <button @click="router.push('/')" class="px-6 py-2 bg-[#e4007f] text-white rounded-full">返回首页</button>
    </div>

    <div v-else class="flex flex-col items-center gap-6 w-full max-w-full px-4">
       <!-- Header Area -->
       <slot name="header">
           <!-- Default Header for Custom Mode or fallback -->
           <div v-if="mode === 'custom'" class="text-center animate-fade-in-up">
               <div class="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-bold mb-2 border border-purple-200">
                   <div i-carbon-user-avatar-filled />
                   网友自制模版
               </div>
               <h1 class="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">{{ templateData?.title }}</h1>
               <div v-if="templateData?.config.creator" class="text-sm text-gray-400 mt-1 font-bold">
                   出题人: {{ templateData.config.creator }}
               </div>
               <!-- Filler Name Input (Unique to Custom) -->
               <div class="mt-4 flex justify-center">
                   <input 
                     v-model="fillerName" 
                     placeholder="填表人昵称 (可选)" 
                     class="text-center bg-transparent border-b border-gray-300 focus:border-pink-500 outline-none py-1 text-gray-600 font-bold placeholder-gray-300"
                   />
               </div>
           </div>
       </slot>
    
       <!-- Hint / Controls -->
       <div class="relative w-full flex flex-col items-center gap-2">
            <!-- Official Mode Hint -->
            <div v-if="mode === 'official'" class="flex items-center gap-2 text-[#e4007f] bg-pink-50/80 px-4 py-1.5 rounded-full border border-pink-100 shadow-sm animate-hint-cycle">
                 <div class="i-carbon-edit text-sm" />
                 <span class="text-xs font-bold">小贴士：表格上方标题、格子下方标签文字，都是可以自定义修改的哦！</span>
            </div>

            <Grid 
                id="grid-capture-target"
                :list="list" 
                :cols="Number(templateData?.config.cols) || 3"
                :title="mode === 'official' ? templateData?.title : ''" 
                :default-title="templateData?.title"
                v-model:customTitle="customTitle"
                @select-slot="handleSelectSlot"
                @update-label="handleUpdateLabel"
                :show-character-name="showCharacterName"
            />
            
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

       <!-- Actions -->
       <div class="flex flex-col items-center gap-4 w-full max-w-md mt-2">
           <button 
              class="w-full px-10 py-3 bg-[#e4007f] text-white rounded-full text-lg font-bold hover:bg-[#c0006b] transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:shadow-pink-500/30 transform hover:-translate-y-1"
              :disabled="saving"
              @click="handleSave"
            >
              <div v-if="saving" class="i-carbon-circle-dash animate-spin text-xl" />
              <div v-else class="i-carbon-image text-xl" />
              <span>{{ saving ? '生成中...' : '保存高清图片' }}</span>
            </button>

            <!-- Secondary Actions -->
            <div class="flex w-full gap-3">
                 <button 
                  class="flex-1 py-3 bg-white text-[#e4007f] border-2 border-[#e4007f] rounded-full font-bold hover:bg-pink-50 transition-all flex items-center justify-center gap-2 shadow-md"
                  @click="isVideoModalOpen = true"
                >
                  <div i-carbon-video-filled />
                  <span>导出视频</span>
                </button>
                
                 <button 
                  class="flex-1 py-3 bg-white text-[#e4007f] border-2 border-[#e4007f] rounded-full font-bold hover:bg-pink-50 transition-all flex items-center justify-center gap-2 shadow-md relative group overflow-hidden"
                  @click="router.push('/create')"
                >
                  <div class="absolute inset-0 bg-pink-100/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <div i-carbon-add-alt />
                  <span>我要出题</span>
                </button>
            </div>
            
            <!-- Extra Slots (e.g. Reset Tags, Open Gallery) -->
            <slot name="extra-actions"></slot>
       </div>
    </div>

    <!-- Modals -->
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
    <VideoSuccessModal :show="isSuccessModalOpen" :format="lastExportFormat" @close="isSuccessModalOpen = false" @open-join-group="() => { isSuccessModalOpen = false; showJoinGroupModal = true }" />
    <JoinGroupModal :show="showJoinGroupModal" @close="showJoinGroupModal = false" />

    <!-- Share Modal -->
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
.animate-hint-cycle {
  animation: hint-cycle 8s ease-in-out infinite;
}
@keyframes hint-cycle {
  0% { opacity: 0; transform: translateY(5px); }
  5% { opacity: 1; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(0); }
  45% { opacity: 0; transform: translateY(-5px); }
  100% { opacity: 0; transform: translateY(-5px); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out;
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
