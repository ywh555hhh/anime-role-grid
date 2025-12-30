<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Grid from '~/components/Grid.vue'
import Search from '~/components/Search.vue'
import VideoExportModal from '~/components/VideoExportModal.vue'
import VideoSuccessModal from '~/components/VideoSuccessModal.vue'
import JoinGroupModal from '~/components/JoinGroupModal.vue'
import { list, currentTemplateId } from '~/logic/storage'
import { exportGridAsImage } from '~/logic/export'
import { useVideoExport } from '~/logic/video-export'

const props = defineProps<{
  templateId: string // NEW: Explicit ID required for saving
  mode: 'official' | 'custom'
  templateData: {
    title: string
    config: {
      cols: number
      items: string[]
      creator?: string
      templateName?: string
    }
  } | null
  loading?: boolean
  error?: string
  customTitle?: string
}>()

const emit = defineEmits<{
  (e: 'open-gallery'): void
  (e: 'reset-tags'): void
  (e: 'update:customTitle', value: string): void
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
    // 1. Analytics & Data Collection
    // We do this concurrently (fire and forget) or await it?
    // Await is safer to ensure we have the data.
    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                templateId: props.templateId, // Use the prop!
                customTitle: props.customTitle || props.templateData?.title || '',
                items: list.value
            })
        })
    } catch (e) {
        console.error('Analytics save failed', e)
        // We don't block the user if analytics fails, just log it.
    }

    // Config object for Draw
    const exportConfig = {
        cols: Number(props.templateData?.config.cols) || 3,
        creator: props.templateData?.config.creator,
        filler: fillerName.value
    }

    generatedImage.value = await exportGridAsImage(
        list.value, 
        props.templateId, // Use the prop!
        props.customTitle || '', 
        'anime-grid', 
        showCharacterName.value,
        exportConfig,
        undefined, // qrCode
        props.mode === 'custom' ? 'challenge' : 'standard',
        props.templateData?.config?.templateName || props.templateData?.title // templateName (Prefer config, fallback to title)
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
       <slot name="header"></slot>
       <!-- Hint / Controls -->
       <div class="relative w-full flex flex-col items-center gap-2">
            <!-- Tip -->
            <div class="flex items-center gap-2 text-[#e4007f] bg-pink-50/80 px-4 py-1.5 rounded-full border border-pink-100 shadow-sm animate-hint-cycle">
                 <div class="i-carbon-edit text-sm" />
                 <span class="text-xs font-bold">小贴士：表格上方标题、格子下方标签文字，都是可以自定义修改的哦！</span>
            </div>

             <!-- Navigation for Custom Mode -->
             <div v-if="mode === 'custom'" class="w-full flex justify-center mb-2">
                 <button 
                    @click="router.push('/')" 
                    class="flex items-center gap-1 text-gray-500 hover:text-[#e4007f] transition-colors py-1 px-4 rounded-full border border-transparent hover:border-pink-100 hover:bg-pink-50"
                 >
                    <div i-carbon-home class="text-lg" />
                    <span class="font-bold text-sm">返回官方模版</span>
                 </button>
             </div>

            <Grid 
                id="grid-capture-target"
                :list="list" 
                :cols="Number(templateData?.config.cols) || 3"
                :title="templateData?.config?.templateName || templateData?.title" 
                :customTitle="props.customTitle"
                @update:customTitle="emit('update:customTitle', $event)"
                @select-slot="handleSelectSlot"
                @update-label="handleUpdateLabel"
                :show-character-name="showCharacterName"
            />
            
             <div class="flex flex-wrap items-center justify-center gap-4 mt-4 w-full px-4">
                <!-- Toggle: Character Names -->
                 <button 
                   class="flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all font-bold text-sm"
                   :class="showCharacterName ? 'bg-[#e4007f] text-white border-[#e4007f]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#e4007f]'"
                   @click="showCharacterName = !showCharacterName"
                 >
                   <div :class="showCharacterName ? 'i-carbon-checkbox-checked' : 'i-carbon-checkbox'" class="text-lg" />
                   <span>显示角色名字</span>
                 </button>

                 <!-- Input: Filler Name (Only for Custom Mode) -->
                 <div v-if="mode === 'custom'" class="flex items-center gap-2 px-4 py-2 bg-white rounded-full border-2 border-gray-200 focus-within:border-[#e4007f] transition-all">
                     <div class="i-carbon-user text-gray-400" />
                     <input 
                       v-model="fillerName" 
                       placeholder="您的昵称 (可选)" 
                       class="bg-transparent outline-none text-sm font-bold text-gray-700 w-32 placeholder-gray-400"
                     />
                 </div>
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
          class="bg-white p-6 md:p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full transform transition-all border-2 border-[#e4007f] max-h-[90vh] overflow-y-auto" 
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
           <p class="text-gray-600 font-medium leading-relaxed mb-4">
            已尝试保存到相册。<br/>
            <span class="text-sm text-gray-400">如果未自动保存，请长按上方图片手动保存哦~</span>
           </p>
           
           <!-- Promo Text (Moved Up) -->
           <p class="text-xs text-pink-500 font-bold mb-4 bg-pink-50 py-2 rounded-lg">
               觉得好玩？你也可以制作一份考考朋友！
           </p>
           
           <div class="flex flex-col gap-3 w-full">
             
             <!-- 1. Bilibili (Primary Focus) -->
             <a 
                href="https://space.bilibili.com/36078469"
                target="_blank"
                class="w-full py-3 bg-[#e4007f] text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg hover:bg-[#c0006b] transition-all flex items-center justify-center gap-2"
             >
                <!-- Bilibili Icon -->
                <svg class="w-5 h-5" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M777.514667 131.669333a53.333333 53.333333 0 0 0-48.426667 26.965334l-50.816 87.168a483.2 483.2 0 0 0-166.4-29.226667c-58.453333 0-114.346667 10.197333-167.082667 29.354667l-50.176-87.296a53.333333 53.333333 0 0 0-93.610666 52.138666L246.229333 289.834667c-112.554667 64.938667-189.696 182.997333-197.888 320.128-0.554667 9.173333-0.853333 18.261333-0.853333 27.264 0 6.058667 0.170667 12.16 0.469333 18.218666 6.058667 134.4 81.365333 249.514667 189.610667 312.362667a476.330667 476.330667 0 0 0 549.973333 0.256c108.416-62.805333 183.936-177.877333 190.122667-312.576 0.298667-6.058667 0.426-12.202667 0.426-18.261333 0-8.96-0.341333-17.962667-0.938667-27.050667-8.192-137.216-85.333333-255.488-197.930666-320.384l45.226666-78.122666a53.333333 53.333333 0 0 0-46.933333-80.042667zM337.024 624.128c-30.848 0-55.850667-27.605333-55.850667-61.696s25.002667-61.696 55.850667-61.696c30.848 0 55.850667 27.605333 55.850666 61.696s-25.002667 61.696-55.850666 61.696z m352.085333 0c-30.848 0-55.850667-27.605333-55.850666-61.696s25.002667-61.696 55.850666-61.696c30.848 0 55.850667 27.605333 55.850667 61.696s-25.002667 61.696-55.850667 61.696z" /></svg>
                <span>关注开发者 @我推的祥子丶</span>
             </a>

             <!-- 2. Make Your Own -->
             <button 
                @click="router.push('/create')" 
                class="w-full py-3 bg-[#e4007f] text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg hover:bg-[#c0006b] transition-all flex items-center justify-center gap-2"
             >
               <div i-carbon-edit />
               <span>我也要制表</span>
             </button>

             <!-- 3. Share System -->
             <button 
               @click="handleShare" 
               class="w-full py-3 bg-white text-[#e4007f] border-2 border-[#e4007f] rounded-xl font-bold hover:bg-pink-50 transition-colors shadow-sm flex items-center justify-center gap-2"
             >
               <div v-if="canShare" i-carbon-share />
               <span>{{ canShare ? '调用系统分享' : '复制图片分享' }}</span>
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
