<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import type { GridItem, GridItemCharacter } from '~/types'
import { VueDraggable } from 'vue-draggable-plus'
import { useGridStore } from '~/stores/gridStore' // Import Store

const props = defineProps<{
  list: GridItem[]
  cols?: number
  title?: string
  customTitle?: string
  defaultTitle?: string
  forExport?: boolean
  showCharacterName?: boolean
  editable?: boolean // New prop to force editability
  isStreamerMode?: boolean
}>()

const emit = defineEmits(['select-slot', 'update:customTitle', 'update-label', 'drop-item'])

// Store access for global drag state
const { isDragging, resolveImage } = useGridStore() 


const editingIndex = ref<number | null>(null)
const editingLabel = ref('')
// In v-for, template refs are arrays
const labelInput = ref<HTMLInputElement[] | null>(null)

function handleLabelClick(index: number) {
  // Allow edit if (not exporting) OR (explicitly editable)
  if (props.forExport && !props.editable) return
  editingIndex.value = index
  if (props.list[index]) {
      editingLabel.value = props.list[index].label
  }
  
  // Auto focus next tick
  nextTick(() => {
    // Since we use v-if, the ref array should contain the element
    if (labelInput.value && labelInput.value.length > 0) {
       // Find the active input or just grab the first one since only one is rendered
       labelInput.value.forEach(el => {
           if (el && el.focus) el.focus()
       })
    }
  })
}

function saveLabel(index: number) {
  if (editingIndex.value !== index) return
  // Emit update if changed
  const currentItem = props.list[index]
  if (currentItem && editingLabel.value !== currentItem.label) {
    emit('update-label', { index, label: editingLabel.value })
  }
  editingIndex.value = null
}

const gridCols = computed(() => props.cols || 5)

function handleSelect(index: number) {
  // If we are currently editing the label for THIS slot, do not trigger selection
  if (editingIndex.value === index) return
  emit('select-slot', index)
}

function handleTitleInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:customTitle', target.value)
}

function getImageUrl(char?: GridItemCharacter | string) {
  // Support both object resolution and legacy string (if passed directly)
  let url = ''
  if (typeof char === 'string') {
      url = char
  } else if (char) {
      url = resolveImage(char) || ''
  }

  if (!url) return ''
  
  if (props.forExport) {
    // Use proxy for export to ensure CORS headers are correct
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png`
  }
  return url
}

// Direct handler for drop events to avoid ephemeral computed refs
function handleSlotDrop(index: number, val: GridItemCharacter[]) {
    // Current item in this slot (if any)
    const current = props.list[index]?.character
    
    let char: GridItemCharacter | undefined

    if (val.length === 0) {
        // Case: Dragged out (Empty)
        char = undefined
    } else if (val.length === 1) {
        // Case: Simple add or swap into empty
        char = val[0]
    } else {
        // Case: Collision [Old, New] or [New, Old]
        // We want the *new* item, i.e., the one that isn't the current one.
        if (current) {
            char = val.find(c => c.id !== current.id)
            // Fallback: If IDs match (same item dropped?) or other edge case, take last
            if (!char) char = val[val.length - 1]
        } else {
            // Should be rare (length > 1 but no current?), take last
            char = val[val.length - 1]
        }
    }

    emit('drop-item', { index, item: char, isMove: true })
}

function onDropAdd(evt: any) {
  // Clean DOM element added by Sortable, let Vue render data
  if (evt.item && evt.item.parentNode) {
    evt.item.parentNode.removeChild(evt.item)
  }
}
</script>

<template>
  <div 
    class="w-full flex flex-col items-center relative"
    :class="{ 'bg-white py-8': forExport }"
  >
    <!-- Custom User Title (Editable) -->
    <div class="relative group mb-2 w-full flex justify-center px-4">
      <div class="relative inline-grid justify-items-center max-w-[90vw] md:max-w-full">
        <!-- Ghost element to set width -->
        <span 
          class="col-start-1 row-start-1 text-xl md:text-3xl font-bold px-2 py-1 invisible whitespace-pre text-center truncate max-w-full"
          style="font-family: 'Noto Serif SC', serif;"
        >
          {{ customTitle || defaultTitle || '我的动漫人物喜好果然有问题' }}
        </span>

        <!-- Actual Input -->
        <input
          :value="customTitle"
          class="col-start-1 row-start-1 w-full h-full text-xl md:text-3xl font-bold text-center bg-transparent border-b-2 rounded-t-lg focus:outline-none transition-all px-2 py-1 text-black cursor-text placeholder-gray-300"
          :class="[
            !customTitle ? 'border-gray-100 dark:border-gray-800' : 'border-transparent',
            'hover:border-gray-300 hover:border-dashed',
            'focus:border-primary focus:border-solid focus:bg-gray-50/30 dark:focus:bg-gray-800/30',
            { 'pointer-events-none border-none': forExport }
          ]"
          style="font-family: 'Noto Serif SC', serif;"
          :placeholder="defaultTitle || '我的动漫人物喜好果然有问题'"
          type="text"
          @input="handleTitleInput"
        >
      </div>
    </div>

    <!-- Template Title -->
    <h2 
      v-if="title"
      class="text-xl font-bold text-primary mb-4 tracking-widest"
      style="font-family: 'Noto Serif SC', serif;"
    >
      — {{ title }} —
    </h2>

    <!-- 
      Responsive Grid:
      - w-full with max-w to ensure it doesn't get too wide on desktop
      - aspect-ratio ensures cells maintain shape
      - text scales with breakpoints
    -->
    <div 
      id="grid-capture-target" 
      class="grid border-t-2 border-l-2 border-black bg-white mx-auto box-content"
      :style="{ 
        gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
        width: '100%',
        maxWidth: `${gridCols * 120}px`,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        transition: 'width 0.3s ease, transform 0.3s ease'
      }"
    >
      <div
        v-for="(item, index) in list"
        :key="index"
        class="relative border-r-2 border-b-2 border-black cursor-pointer group box-border flex flex-col transition-colors duration-200 min-w-0"
        :class="{ 
            'ring-4 ring-primary/50 ring-inset bg-primary/5': isStreamerMode && isDragging,
            'hover:bg-primary/10': isStreamerMode && isDragging 
        }"
        :style="{ aspectRatio: showCharacterName ? '120 / 212' : '120/187' }"
        @click="handleSelect(index)"
      >
        <!-- Character Image -->
        <!-- flex-grow ensures image takes available space minus label -->
        <div class="flex-grow w-full relative overflow-hidden bg-gray-50">
          
          <!-- Drop Zone Overlay (Streamer Mode) -->
             <VueDraggable
                v-if="isStreamerMode"
                :modelValue="item.character ? [item.character] : []"
                @update:modelValue="handleSlotDrop(index, $event)"
                :group="{ name: 'grid', put: true, pull: true }"
                class="absolute inset-0 z-20 w-full h-full flex items-stretch justify-stretch"
                :class="{ 'pointer-events-auto': isStreamerMode, 'cursor-grab': isStreamerMode && item.character }"
                ghost-class="ghost-preview"
                :sort="false"
                @add="onDropAdd($event)"
                @start="isDragging = true"
                @end="isDragging = false"
             >
             <template v-if="item.character">
                  <div 
                    :data-id="item.character.id" 
                    class="w-full h-full relative"
                  >
                      <img 
                        :src="getImageUrl(item.character)" 
                        class="w-full h-full object-cover object-top pointer-events-none"
                      />
                  </div>
             </template>
          </VueDraggable>

          <img 
            v-if="!isStreamerMode && item.character"
            :src="getImageUrl(item.character)" 
            class="absolute inset-0 w-full h-full object-cover object-top"
            :loading="forExport ? 'eager' : 'lazy'"
            :crossorigin="forExport ? 'anonymous' : undefined"
          >
          <!-- Empty State Placeholder -->
          <div v-else class="absolute inset-0 bg-white" />
        </div>

        <!-- Label Area (Bottom) -->
        <!-- Name Area (Optional) -->
        <div 
          v-if="showCharacterName"
          class="h-[20px] md:h-[25px] flex-shrink-0 flex items-center justify-center text-center bg-white border-t-2 border-black overflow-hidden px-1"
        >
          <span class="truncate w-full text-[10px] md:text-sm font-bold text-black leading-none">
            {{ item.character?.name || '' }}
          </span>
        </div>

        <!-- Label Area (Bottom) -->
        <div 
          class="h-[20px] md:h-[25px] flex-shrink-0 flex items-center justify-center text-center bg-white border-t-2 border-black overflow-hidden px-1 relative w-full min-w-0"
          @click.stop="handleLabelClick(index)"
        >
          <input
            v-if="editingIndex === index && (!forExport || editable)"
            ref="labelInput"
            v-model="editingLabel"
            class="absolute inset-0 block min-w-0 w-full h-full text-center text-[10px] md:text-sm font-bold text-black bg-white outline-none p-0 border-none"
            @blur="saveLabel(index)"
            @keydown.enter="saveLabel(index)"
            @click.stop
          >
          <span 
            v-else
            class="truncate w-full text-[10px] md:text-sm font-bold text-black leading-none"
          >{{ item.label }}</span>
        </div>
        
        <!-- Hover Effect -->
        <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    </div>
    <!-- Watermark for Export -->
    <div 
      v-if="forExport" 
      class="absolute bottom-1 right-4 flex items-center gap-1 pointer-events-none"
    >
      <span 
        class="text-black text-sm font-bold tracking-widest" 
        style="font-family: 'Noto Serif SC', 'FZQingKeBenYueSong', 'FangSong', serif;"
      >
        【我推<span class="text-primary">的</span>格子】
      </span>
      <img src="/logo.png" class="w-6 h-6 object-contain" />
    </div>
  </div>
</template>

<style scoped>
:deep(.ghost-preview) {
   position: absolute !important;
   top: 0;
   left: 0;
   width: 100% !important;
   height: 100% !important;
   opacity: 1 !important;
   z-index: 50;
   border: 3px solid #e4007f; /* Primary */
   background-color: white;
   overflow: hidden; /* Ensure image doesn't overflow */
}

/* Force the inner content of the ghost (the dock item clone) to fill the area */
:deep(.ghost-preview > div) {
    width: 100% !important;
    height: 100% !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: transparent !important;
}

:deep(.ghost-preview img) {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    object-position: top !important; /* Keep focus on face */
    border-radius: 0 !important;
}

/* Hide any overlays (name tag, delete button) in the grid ghost */
:deep(.ghost-preview .absolute) {
    display: none !important;
}
</style>
