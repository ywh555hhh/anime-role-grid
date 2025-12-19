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
import { startStreamerTour } from '~/logic/streamerTour' // NEW: Store
import { exportGridAsImage } from '~/logic/export'
import { useVideoExport } from '~/logic/video-export'
import { toast } from 'vue-sonner' 
import StreamerDock from '~/components/StreamerDock.vue'
import { useFullscreen } from '@vueuse/core' // NEW

// Props: Minimal now, just UI flags if needed
// Actually, for backward compat with slots, we might keep it simple.
// But we want to rely on Store for data.
const props = defineProps<{
  // Optional overrides, but mostly we use store
  customTitle?: string
}>()

const emit = defineEmits<{
  (e: 'open-gallery'): void
  (e: 'reset-tags'): void
  (e: 'update:customTitle', value: string): void
}>()

const router = useRouter()
const store = useGridStore()

// Store State Destructuring
const { 
  currentList, 
  currentTitle, 
  currentConfig, 
  isCustomMode: modeIsCustom, 
  currentTemplateId, 
  isLoading: storeLoading,
  error: storeError,
  updateItem,
  saveToCloud,
  isStreamerMode, // NEW
  isToolbarOpen, // NEW: Synced with Dock
  addToDock,
  undo, redo, canUndo, canRedo, // NEW
  isCanvasLocked // NEW
} = store

// Full Screen Logic
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()





// Local State
const showSearch = ref(false)
const showShareModal = ref(false)
const showJoinGroupModal = ref(false)
const showCharacterName = ref(false)
const currentSlotIndex = ref<number | null>(null)
const fillerName = ref('') // For custom mode
const canvasScale = ref(1) // Zoom Level

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
    // Normalise item (Search emits wrapped {item, rect}, Custom emits item directly)
    const item = payload.item || payload
    
    if (isStreamerMode.value) {
        if (item) {
           addToDock(item)
           toast.success(`已添加到卡池: ${item.name}`)
        }
    } else {
        // Standard mode
        if (item) {
            handleAdd(item)
        }
    }
}

function handleDropItem(payload: { index: number, itemId?: string, item?: any }) {
   if ('item' in payload) {
       updateItem(payload.index, payload.item)
       // Only toast on adding, not removing/moving out (which clears source)
       // Actually moving out clears source, moving in sets target.
       // We only care about the target update here.
       // If clearing (item undefined), no toast needed or 'Removed'.
       if (payload.item) {
           // toast.success('填入成功') // Optional, maybe too noisy for drag & drop
       }
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
// Layout Classes
const mainContainerClass = computed(() => {
   if (isStreamerMode.value) {
      // Streamer Mode: Locked Layout (Game UI feel)
      return "flex flex-col md:flex-row w-full h-screen overflow-hidden items-stretch bg-gray-50 dark:bg-gray-900 fixed inset-0 z-40" 
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
    
    // Clear item (keep label, remove character)
    const item = currentList.value[index]
    if (item) {
        updateItem(index, undefined)
    }
    
    showSearch.value = false;
    currentSlotIndex.value = null;
}

function handleUpdateLabel(payload: { index: number, label: string }) {
  // Update store directly? 
  // Store updateItem currently takes character. We might need updateItemLabel?
  // For now let's hack it: read current, update label, write back.
  // Actually, useGridStore item is { label, character }.
  const index = payload.index
  const oldItem = currentList.value[index]
  if (oldItem) {
     const newItem = { ...oldItem, label: payload.label }
     // We need a way to update the WHOLE item or just label.
     // Let's modify store.updateItem to accept partial? Or manually set list.
     // Since `currentList` is writable in store:
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
    // 1. Analytics & Data Collection (Via Store)
    try {
        await saveToCloud()
    } catch (e) {
        console.error('Analytics save failed', e)
    }

    // Config object for Draw
    const exportConfig = {
        cols: Number(currentConfig.value?.cols) || 3,
        creator: currentConfig.value?.creator,
        filler: fillerName.value
    }

    // Determine titles
    // Template Name (Subtitle) - Should NOT use customTitle
    const templateName = currentConfig.value?.templateName || currentTitle.value

    generatedImage.value = await exportGridAsImage(
        currentList.value, 
        currentTemplateId.value, 
        props.customTitle || '', 
        'anime-grid', 
        showCharacterName.value,
        exportConfig,
        undefined, // qrCode
        modeIsCustom.value ? 'challenge' : 'standard',
        templateName
    )
    showShareModal.value = true
  } catch (e: any) {
    toast.error('保存失败: ' + e.message)
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
   // Use store config
   const items = currentConfig.value?.items || currentList.value.map(i => i.label)
   generateVideo(currentList.value, items, { ...settings, showName: showCharacterName.value })
}


</script>

<template>
  <div class="w-full flex flex-col items-center">
    
    <!-- Loading / Error States -->
    <div v-if="storeLoading" class="flex justify-center py-20">
        <div class="animate-spin i-carbon-circle-dash text-4xl text-primary"></div>
    </div>

    <div v-else-if="storeError" class="text-center py-20">
        <h2 class="text-2xl font-bold mb-4">😢 {{ storeError }}</h2>
        <button @click="router.push('/')" class="btn-primary">返回首页</button>
    </div>

    <div v-else :class="mainContainerClass">
       
       <div :class="canvasAreaClass" id="streamer-mode-container">
           
           <!-- Streamer Mode: Zoom & Scroll Layout -->
           <template v-if="isStreamerMode">
               <!-- Zoom Controls -->
               <Transition
                    enter-active-class="transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
                    enter-from-class="opacity-0 translate-y-10"
                    enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition-all duration-200 ease-in"
                    leave-from-class="opacity-100 translate-y-0"
                    leave-to-class="opacity-0 translate-y-10"
               >
               <!-- Wrapper for Lifecycle Transition & Positioning -->
               <div v-show="isToolbarOpen" id="zoom-controls" class="absolute bottom-6 left-6 z-30">
                    <!-- Inner for Visuals & Hover Interaction -->
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

               <!-- Scroll Container -->
               <div 
                  id="streamer-canvas-area" 
                  class="w-full h-full flex flex-col items-center py-10 relative"
                  :class="isCanvasLocked ? 'overflow-hidden' : 'overflow-auto'"
               >
                    <!-- Mobile Branding (Top of Canvas) -->
                    <div class="md:hidden pb-6 select-none opacity-80">
                         <h1 class="text-lg font-black text-gray-900 dark:text-gray-100 tracking-widest" style="font-family: 'Noto Serif SC', serif;">
                            【我推<span class="text-primary">的</span>格子】
                        </h1>
                    </div>

                    <!-- Scalable Wrapper -->
                    <div 
                        :style="{ transform: `scale(${canvasScale})`, transformOrigin: 'top center' }"
                        class="transition-transform duration-200 ease-out origin-top"
                    >
                        <GridCanvas
                             :list="currentList"
                             :cols="Number(currentConfig?.cols) || 3"
                             :title="currentConfig?.templateName || currentTitle"
                             :customTitle="props.customTitle"
                             v-model:showCharacterName="showCharacterName"
                             :modeIsCustom="modeIsCustom"
                             v-model:fillerName="fillerName"
                             :is-streamer-mode="isStreamerMode"
                             @update:customTitle="emit('update:customTitle', $event)"
                             @select-slot="handleSelectSlot"
                             @update-label="handleUpdateLabel"
                             @return-home="router.push('/')"
                             @drop-item="handleDropItem"
                        />
                    </div>
               </div>
           </template>

           <!-- Standard Mode Layout -->
           <template v-else>
               <div class="w-full flex justify-center">
                    <slot name="header"></slot>
               </div>
               
               <GridCanvas
                    :list="currentList"
                    :cols="Number(currentConfig?.cols) || 3"
                    :title="currentConfig?.templateName || currentTitle"
                    :customTitle="props.customTitle"
                    v-model:showCharacterName="showCharacterName"
                    :modeIsCustom="modeIsCustom"
                    v-model:fillerName="fillerName"
                    :is-streamer-mode="isStreamerMode"
                    @update:customTitle="emit('update:customTitle', $event)"
                    @select-slot="handleSelectSlot"
                    @update-label="handleUpdateLabel"
                    @return-home="router.push('/')"
                    @drop-item="handleDropItem"
               />
        
               <!-- Standard Toolbar -->
               <div class="mt-4 w-full flex justify-center">
                    <GridActionButtons 
                        :saving="saving"
                        @save="handleSave"
                        @export-video="isVideoModalOpen = true"
                        @create-new="router.push('/create')"
                    >
                        <template #extra-actions>
                             <!-- Toggle: Character Names -->
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
           
        <!-- Deleted old structure -->
           
       </div>
           
           <!-- V3: Responsive Toolbar (Streamer Mode Only) -->
           <!-- Position: Fixed Bottom (Desktop) / Right (Mobile) -->
           <!-- V3: Responsive Toolbar (Streamer Mode Only) -->
           <!-- Position: Fixed Bottom (Desktop) / Right (Mobile) -->
           <!-- Optimized Positioning: Use Layout/Margin instead of Transform to avoid Transition conflicts -->
           <Transition
                enter-active-class="transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
                enter-from-class="opacity-0 translate-x-10 md:translate-x-0 md:translate-y-10"
                enter-to-class="opacity-100 translate-x-0 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 translate-x-0 translate-y-0"
                leave-to-class="opacity-0 translate-x-10 md:translate-x-0 md:translate-y-10"
           >
           <div 
             v-if="isStreamerMode && isToolbarOpen" 
             id="streamer-toolbar"
             class="fixed z-50 flex pointer-events-none"
             :class="[
               // Desktop Position: Bottom Center (Using inset/margin)
               'md:bottom-8 md:left-0 md:right-0 md:top-auto md:justify-center md:items-end md:w-full',
               // Mobile Position: Right Center (Using flex column)
               'top-0 bottom-0 right-3 left-auto flex-col justify-center items-end',
             ]"
           >
                <!-- Expanded Content -->
                <div 
                    class="pointer-events-auto bg-white/90 dark:bg-gray-800/90 backdrop-blur shadow-2xl rounded-2xl p-2 md:p-3 flex items-center gap-3 md:gap-4 border border-gray-200 dark:border-gray-700 shrink-0"
                     :class="[
                        'flex-col md:flex-row' // Mobile: Col, Desktop: Row
                     ]"
                >
                    <!-- Group 1: History -->
                    <div class="flex gap-2" :class="{ 'flex-col md:flex-row': true }">
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

                    <div class="w-6 h-px bg-gray-200 dark:bg-gray-700 md:w-px md:h-6 shrink-0" />

                    <!-- Group 2: View Controls -->
                    <div class="flex gap-2" :class="{ 'flex-col md:flex-row': true }">
                         <button 
                            class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            :class="{ 'text-primary bg-primary/10': showCharacterName }"
                            @click="showCharacterName = !showCharacterName"
                            title="显示角色名"
                        >
                            <div class="i-carbon-text-font text-xl" />
                        </button>
                        <button 
                             class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                             @click="toggleFullscreen"
                             :title="isFullscreen ? '退出全屏' : '全屏体验'"
                             >
                             <div :class="isFullscreen ? 'i-carbon-minimize' : 'i-carbon-maximize'" class="text-xl" />
                        </button>
                    </div>

                     <div class="w-6 h-px bg-gray-200 dark:bg-gray-700 md:w-px md:h-6 shrink-0" />
 
                     <!-- Group 3: File Actions -->
                     <div class="flex gap-2" :class="{ 'flex-col md:flex-row': true }">
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
                             title="保存"
                         >
                             <div class="i-carbon-save text-xl" />
                         </button>
                     </div>

                    <div class="w-6 h-px bg-gray-200 dark:bg-gray-700 md:w-px md:h-6 shrink-0" />

                    <!-- Hide / Exit -->
                    <div class="flex gap-2" :class="{ 'flex-col md:flex-row': true }">
                         <button 
                            class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500"
                            @click="isToolbarOpen = false"
                            title="收起工具栏"
                        >
                            <div class="i-carbon-chevron-right md:hidden text-xl" /> <!-- Mobile Icon: Right Arrow to indicate 'push right' -->
                            <div class="i-carbon-chevron-down hidden md:block text-xl" /> <!-- Desktop Icon: Down Arrow -->
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


       <!-- Dock (Streamer Mode Only) -->
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

    <ImageExportModal 
        v-model="showShareModal"
        :imageSrc="generatedImage"
        :canShare="canShare"
        @share="handleShare"
    />
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
