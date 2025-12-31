<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Search from '~/components/Search.vue'
import VideoExportModal from '~/components/VideoExportModal.vue'
import VideoSuccessModal from '~/components/VideoSuccessModal.vue'
import JoinGroupModal from '~/components/JoinGroupModal.vue'
import GridCanvas from '~/components/GridCanvas.vue'
import GridActionButtons from '~/components/GridActionButtons.vue'
import ImageExportModal from '~/components/ImageExportModal.vue'
import { useGridStore } from '~/stores/gridStore'
import { startStreamerTour } from '~/logic/streamerTour' 
import { exportGridAsImage } from '~/logic/export'
import { useVideoExport } from '~/logic/video-export'
import { toast } from 'vue-sonner' 
import StreamerDock from '~/components/StreamerDock.vue'
import { useFullscreen } from '@vueuse/core' 
import { useModalStore, MODAL_PRIORITY } from '~/stores/modalStore' // NEW
import { matchEasterEgg } from '~/logic/easterEggs' // NEW
import EasterEggModal from '~/components/EasterEggModal.vue' // NEW

defineProps<{
  error?: string
}>()

const emit = defineEmits<{
  (e: 'open-gallery'): void
  (e: 'reset-tags'): void
  (e: 'update:customTitle', value: string): void
}>()

const router = useRouter()
const store = useGridStore()
const modalStore = useModalStore // NEW

// Store State Destructuring
const { 
  currentList, 
  currentTitle, 
  currentTemplateName, 
  currentConfig, 
  isCustomMode: modeIsCustom, 
  currentTemplateId, 
  isLoading: storeLoading,
  error: storeError,
  updateItem,
  saveToCloud,
  isStreamerMode, 
  isToolbarOpen, 
  addToDock,
  undo, redo, canUndo, canRedo, 
  isCanvasLocked, 
  resolveImage
} = store

// Full Screen Logic
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

// Local State
const showSearch = ref(false)

const showJoinGroupModal = ref(false)
const showCharacterName = ref(false)
const currentSlotIndex = ref<number | null>(null)
const fillerName = ref('') 
const canvasScale = ref(1) 

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
  
  updateItem(index, character)
  
  showSearch.value = false
  currentSlotIndex.value = null
}

function handleSearchAdd(payload: any) {
    const item = payload.item || payload
    
    if (isStreamerMode.value) {
        if (item) {
           addToDock(item)
           toast.success(`已添加到卡池: ${item.name}`)
        }
    } else {
        if (item) {
            handleAdd(item)
        }
    }
}

function handleDropItem(payload: { index: number, itemId?: string, item?: any }) {
   if ('item' in payload) {
       updateItem(payload.index, payload.item)
       return
   }

   if (payload.itemId) {
       const dockItem = store.dockItems.value.find(i => i.id == payload.itemId || i.id == Number(payload.itemId))
       if (dockItem) {
         updateItem(payload.index, dockItem)
         toast.success('填入成功')
       }
   }
}

// Layout Classes
const mainContainerClass = computed(() => {
   if (isStreamerMode.value) {
      return "flex flex-col md:flex-row w-full h-[100dvh] overflow-hidden items-stretch bg-gray-50 dark:bg-gray-900 fixed inset-0 z-40" 
   }
   return "flex flex-col items-center gap-6 w-full max-w-full px-4"
})

const canvasAreaClass = computed(() => {
   if (isStreamerMode.value) {
       return "flex-1 relative w-full h-full overflow-hidden bg-gray-50/50 dark:bg-gray-900/50"
   }
   return "w-full flex flex-col items-center gap-6"
})

function handleClear() {
    const index = currentSlotIndex.value
    if (index === null) return;
    
    const item = currentList.value[index]
    if (item) {
        updateItem(index, undefined)
    }
    
    showSearch.value = false;
    currentSlotIndex.value = null;
}

function handleUpdateLabel(payload: { index: number, label: string }) {
  const index = payload.index
  const oldItem = currentList.value[index]
  if (oldItem) {
     const newItem = { ...oldItem, label: payload.label }
     const newList = [...currentList.value]
     newList[index] = newItem
     currentList.value = newList
  }
}

// --- Export Logic ---

async function handleSave() {
  if (saving.value) return
  saving.value = true
  try {
    try {
        await saveToCloud()
    } catch (e) {
        console.error('Analytics save failed', e)
    }

    const exportConfig = {
        cols: Number(currentConfig.value?.cols) || 3,
        creator: currentConfig.value?.creator,
        filler: fillerName.value
    }

    const mainTitle = currentTitle.value || currentConfig.value?.defaultTitle || ''
    const templateName = currentTemplateName.value

    const resolvedList = currentList.value.map(item => {
        if (!item.character) return item;
        return {
            ...item,
            character: {
                ...item.character,
                image: resolveImage(item.character)
            }
        }
    })

    generatedImage.value = await exportGridAsImage(
        resolvedList, 
        currentTemplateId.value, 
        mainTitle, 
        'anime-grid', 
        showCharacterName.value,
        exportConfig,
        undefined, 
        modeIsCustom.value ? 'challenge' : 'standard',
        templateName
    )

    // --- REFACTORED: Use Global Dispatcher ---
    
    // 1. Push Image Modal (Priority: INTERACTION)
    modalStore.openModal(ImageExportModal, {
        imageSrc: generatedImage.value,
        canShare: canShare,
        onShare: handleShare,
        modelValue: true, // Needed if component uses v-model? But Dispatcher passes true.
        // Actually ImageExportModal has v-model="showShareModal" (boolean).
        // Dispatcher passes 'modelValue' prop as true.
        // And listens to 'update:modelValue' to close.
        // We need to ensure we don't conflict. 
        // In Dispatcher.vue: :modelValue="true" @update:modelValue="(val) => !val && handleClose()"
        // So we don't need to pass extra props here.
     }, MODAL_PRIORITY.INTERACTION)

    // B. Check & Push Easter Egg
    // Debug: Check text content
    const egg = matchEasterEgg(currentList.value)
    if (egg) {
        console.log('[EasterEgg] Matched:', egg.id)
        toast.success(`🎉 检测到 ${egg.title} 彩蛋！请在关闭分享窗口后查看~`, { duration: 5000 }) // Inform user
        modalStore.openModal(EasterEggModal, {
            show: true,
            config: egg,
            onClose: () => modalStore.closeModal()
        }, MODAL_PRIORITY.PROMOTION)
    } else {
        console.log('[EasterEgg] No match found.')
    }

  } catch (e: any) {
    toast.error('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function handleShare() {
    // Logic for Web Share API
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
    // If share fails or not supported, we usually just let the modal stay open.
    // In new dispatcher, "showShareModal.value = false" is meaningless. 
    // We just do nothing, let user manually close.
}

// --- Video Logic ---
const { isModalOpen: isVideoModalOpen, isSuccessModalOpen, isExporting, progress, statusText, lastExportFormat, generateVideo } = useVideoExport()
function handleVideoExport(settings: any) {
   const items = currentConfig.value?.items || currentList.value.map(i => i.label)
   const resolvedList = currentList.value.map(item => {
        if (!item.character) return item;
        return {
            ...item,
            character: {
                ...item.character,
                image: resolveImage(item.character)
            }
        }
    })
   generateVideo(resolvedList, items, { ...settings, showName: showCharacterName.value })
}
</script>

<template>
  <div class="w-full flex flex-col items-center">
    
    <div v-if="storeLoading" class="flex justify-center py-20">
        <div class="animate-spin i-carbon-circle-dash text-4xl text-primary"></div>
    </div>

    <div v-else-if="storeError" class="text-center py-20">
        <h2 class="text-2xl font-bold mb-4">😢 {{ storeError }}</h2>
        <button @click="router.push('/')" class="btn-primary">返回首页</button>
    </div>

    <div v-else :class="mainContainerClass">
       
       <div :class="canvasAreaClass" id="streamer-mode-container">
           
           <template v-if="isStreamerMode">
               <Transition
                    enter-active-class="transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
                    enter-from-class="opacity-0 translate-y-10"
                    enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition-all duration-200 ease-in"
                    leave-from-class="opacity-100 translate-y-0"
                    leave-to-class="opacity-0 translate-y-10"
               >
               <div v-show="isToolbarOpen" id="zoom-controls" class="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                    <div class="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full px-4 py-2 shadow-lg border border-gray-200 dark:border-gray-700 transition-opacity hover:opacity-100 opacity-60">
                        <button @click="canvasScale = Math.max(0.5, canvasScale - 0.1)" class="p-1 hover:text-primary transition-colors"><div i-carbon-subtract /></button>
                        <span class="text-xs font-bold w-12 text-center tabular-nums">{{ Math.round(canvasScale * 100) }}%</span>
                        <button @click="canvasScale = Math.min(2, canvasScale + 0.1)" class="p-1 hover:text-primary transition-colors"><div i-carbon-add /></button>
                        <div class="w-px h-3 bg-gray-300 mx-1"></div>
                        <button @click="canvasScale = 1" class="text-xs text-gray-500 hover:text-primary" title="重置">重置</button>
                        <div class="w-px h-3 bg-gray-300 mx-1"></div>
                        <button @click="startStreamerTour" class="p-1 hover:text-primary transition-colors" title="使用教程"><div i-carbon-help class="text-base" /></button>
                    </div>
               </div>
               </Transition>

               <div 
                  id="streamer-canvas-area" 
                  class="w-full h-full flex flex-col items-center py-10 relative"
                  :class="isCanvasLocked ? 'overflow-hidden' : 'overflow-auto'"
               >
                    <div class="md:hidden pb-6 select-none opacity-80">
                         <h1 class="text-lg font-black text-gray-900 dark:text-gray-100 tracking-widest" style="font-family: 'Noto Serif SC', serif;">
                            【我推<span class="text-primary">的</span>格子】
                        </h1>
                    </div>

                    <div 
                        :style="{ transform: `scale(${canvasScale})`, transformOrigin: 'top center' }"
                        class="transition-transform duration-200 ease-out origin-top"
                    >
                        <GridCanvas
                             :list="currentList"
                             :cols="Number(currentConfig?.cols) || 3"
                             :title="currentTemplateName"
                             :customTitle="currentTitle"
                             :defaultTitle="currentConfig?.defaultTitle"
                             v-model:showCharacterName="showCharacterName"
                             :modeIsCustom="modeIsCustom"
                             v-model:fillerName="fillerName"
                             :is-streamer-mode="isStreamerMode"
                             @update:customTitle="currentTitle = $event"
                             @select-slot="handleSelectSlot"
                             @update-label="handleUpdateLabel"
                             @return-home="router.push('/')"
                             @drop-item="handleDropItem"
                        />
                    </div>
               </div>
           </template>

           <template v-else>
               <div class="w-full flex justify-center">
                    <slot name="header"></slot>
               </div>
               
               <GridCanvas
                    :list="currentList"
                    :cols="Number(currentConfig?.cols) || 3"
                    :title="currentTemplateName"
                    :customTitle="currentTitle"
                    :defaultTitle="currentConfig?.defaultTitle"
                    v-model:showCharacterName="showCharacterName"
                    :modeIsCustom="modeIsCustom"
                    v-model:fillerName="fillerName"
                    :is-streamer-mode="isStreamerMode"
                    @update:customTitle="currentTitle = $event"
                    @select-slot="handleSelectSlot"
                    @update-label="handleUpdateLabel"
                    @return-home="router.push('/')"
                    @drop-item="handleDropItem"
               />
        
               <div class="mt-4 w-full flex justify-center">
                    <GridActionButtons 
                        :saving="saving"
                        @save="handleSave"
                        @export-video="isVideoModalOpen = true"
                        @create-new="router.push('/create')"
                    >
                        <template #extra-actions>
                             <button 
                               class="w-full mt-2 py-2 rounded-lg border-2 transition-all font-bold text-gray-400 border-gray-300 hover:border-primary hover:text-primary flex items-center justify-center gap-2"
                               :class="{ 'bg-primary/5 border-primary text-primary': showCharacterName }"
                               @click="showCharacterName = !showCharacterName"
                             >
                               <div :class="showCharacterName ? 'i-carbon-checkbox-checked' : 'i-carbon-checkbox'" class="text-xl" />
                               <span>显示角色名字</span>
                             </button>
    
                            <button 
                                class="w-full mt-2 py-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                                @click="isStreamerMode = true"
                            >
                                 <div class="i-carbon-game-console" />
                                 <span>进入主播模式 (Beta)</span>
                             </button>
                            <slot name="extra-actions"></slot>
                        </template>
                    </GridActionButtons>
               </div>
           </template>
           
       </div>
           
           <Transition
                enter-active-class="transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
                enter-from-class="opacity-0 translate-x-10 md:-translate-x-10"
                enter-to-class="opacity-100 translate-x-0 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 translate-x-0 translate-y-0"
                leave-to-class="opacity-0 translate-x-10 md:-translate-x-10"
           >
           <div 
             v-if="isStreamerMode && isToolbarOpen" 
             id="streamer-toolbar"
             class="fixed z-50 flex pointer-events-none"
             :class="[
               'md:top-1/2 md:left-8 md:right-auto md:-translate-y-1/2 md:flex-col md:items-start',
               'top-0 bottom-0 right-3 left-auto flex-col justify-center items-end',
             ]"
           >
                <div 
                    class="pointer-events-auto bg-white/90 dark:bg-gray-800/90 backdrop-blur shadow-2xl rounded-2xl p-2 md:p-3 flex items-center gap-3 md:gap-4 border border-gray-200 dark:border-gray-700 shrink-0"
                     :class="[
                        'flex-col'
                     ]"
                >
                    <div class="flex gap-2 flex-col">
                        <button 
                            class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            :disabled="!canUndo"
                            @click="undo()"
                            title="撤销"
                        >
                            <div class="i-carbon-undo text-xl" />
                        </button>
                        <button 
                            class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            :disabled="!canRedo"
                            @click="redo()"
                            title="重做"
                        >
                            <div class="i-carbon-redo text-xl" />
                        </button>
                    </div>

                    <div class="w-6 h-px bg-gray-200 dark:bg-gray-700 md:w-full md:h-px shrink-0" />

                    <div class="flex gap-2 flex-col">
                         <button 
                            class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            :class="{ 'text-primary bg-primary/10': showCharacterName }"
                            @click="showCharacterName = !showCharacterName"
                            title="显示角色名"
                        >
                            <span class="text-xl font-black font-serif leading-none">N</span>
                        </button>
                        <button 
                             class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                             @click="toggleFullscreen"
                             :title="isFullscreen ? '退出全屏' : '全屏体验'"
                             >
                             <div :class="isFullscreen ? 'i-carbon-minimize' : 'i-carbon-maximize'" class="text-xl" />
                        </button>
                    </div>

                     <div class="w-6 h-px bg-gray-200 dark:bg-gray-700 md:w-full md:h-px shrink-0" />
 
                     <div class="flex gap-2 flex-col">
                         <button 
                             class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                             :class="{ 'text-primary bg-primary/10': isCanvasLocked }"
                             @click="isCanvasLocked = !isCanvasLocked"
                             :title="isCanvasLocked ? '解锁画布' : '锁定画布 (禁止滚动)'"
                         >
                             <div :class="isCanvasLocked ? 'i-carbon-locked' : 'i-carbon-unlocked'" class="text-xl" />
                         </button>
                         <button 
                             class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                             @click="emit('open-gallery')"
                             title="切换模板"
                         >
                             <div class="i-carbon-grid text-xl" />
                         </button>
                          <button 
                             class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                             @click="handleSave"
                             title="保存图片"
                         >
                             <div class="i-carbon-image text-xl" />
                         </button>
                     </div>

                    <div class="w-6 h-px bg-gray-200 dark:bg-gray-700 md:w-full md:h-px shrink-0" />

                    <div class="flex gap-2 flex-col">
                         <button 
                            class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500"
                            @click="isToolbarOpen = false"
                            title="收起工具栏"
                        >
                            <div class="i-carbon-chevron-right md:hidden text-xl" /> 
                            <div class="i-carbon-chevron-left hidden md:block text-xl" /> 
                        </button>
                        <button 
                            class="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors"
                            @click="isStreamerMode = false"
                            title="退出模式"
                        >
                            <div class="i-carbon-logout text-xl" />
                        </button>
                    </div>
                </div>
            </div>
           </Transition>

       <StreamerDock 
            v-if="isStreamerMode"
            @open-search="showSearch = true"
       />
    </div>

    <!-- Modals -->
    <Transition>
      <Search
        v-if="showSearch"
        :mode="isStreamerMode ? 'streamer' : 'single'"
        @add="handleSearchAdd"
        @clear="handleClear"
        @close="showSearch = false"
      />
    </Transition>

    <VideoExportModal v-model="isVideoModalOpen" :loading="isExporting" :progress="progress" :status-text="statusText" @start-export="handleVideoExport" />
    <VideoSuccessModal :show="isSuccessModalOpen" :format="lastExportFormat" @close="isSuccessModalOpen = false" @open-join-group="() => { isSuccessModalOpen = false; showJoinGroupModal = true }" />
    <JoinGroupModal :show="showJoinGroupModal" @close="showJoinGroupModal = false" />

    <!-- MOVED ImageExportModal TO GLOBAL DISPATCHER -->
    <!-- Removed from here to prevent duplicate render -->

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
