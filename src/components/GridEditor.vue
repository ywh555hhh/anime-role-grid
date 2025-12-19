<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Search from '~/components/Search.vue'
import VideoExportModal from '~/components/VideoExportModal.vue'
import VideoSuccessModal from '~/components/VideoSuccessModal.vue'
import JoinGroupModal from '~/components/JoinGroupModal.vue'
import GridCanvas from '~/components/GridCanvas.vue'
import GridActionButtons from '~/components/GridActionButtons.vue'
import ImageExportModal from '~/components/ImageExportModal.vue'
import { useGridStore } from '~/stores/gridStore' // NEW: Store
import { exportGridAsImage } from '~/logic/export'
import { useVideoExport } from '~/logic/video-export'
import { toast } from 'vue-sonner' // NEW


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
  saveToCloud
} = store

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
  
  updateItem(index, character)
  
  showSearch.value = false
  currentSlotIndex.value = null
}

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

    <div v-else class="flex flex-col items-center gap-6 w-full max-w-full px-4">
       <!-- Header Area -->
       <slot name="header"></slot>
       
       <!-- Grid Canvas (Wraps Grid & Controls) -->
       <GridCanvas
            :list="currentList"
            :cols="Number(currentConfig?.cols) || 3"
            :title="currentConfig?.templateName || currentTitle"
            :customTitle="props.customTitle"
            v-model:showCharacterName="showCharacterName"
            :modeIsCustom="modeIsCustom"
            v-model:fillerName="fillerName"
            @update:customTitle="emit('update:customTitle', $event)"
            @select-slot="handleSelectSlot"
            @update-label="handleUpdateLabel"
            @return-home="router.push('/')"
       />

       <!-- Actions Toolbar -->
       <GridActionButtons 
            :saving="saving"
            @save="handleSave"
            @export-video="isVideoModalOpen = true"
            @create-new="router.push('/create')"
       >
            <template #extra-actions>
                <slot name="extra-actions"></slot>
            </template>
       </GridActionButtons>
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
