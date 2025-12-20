<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { useGridOS } from '~/stores/gridOS'
import type { GridOSSlot } from '~/logic/gridos/core/types'

const props = defineProps<{
    slotDef: { id: string, label: string },
    showName?: boolean
}>()

const emit = defineEmits<{
    (e: 'update:label', val: string): void
}>()

const store = useGridOS()
const card = computed(() => store.getCardInSlot(props.slotDef.id))

// Editing State
const isEditing = ref(false)
const editInput = ref<HTMLInputElement | null>(null)
const isDraggingOver = ref(false)

function startEdit() {
    isEditing.value = true
    nextTick(() => {
        editInput.value?.focus()
    })
}

function finishEdit(e: Event) {
    const target = e.target as HTMLInputElement
    emit('update:label', target.value)
    isEditing.value = false
}

// Drag Drop Logic (The Pipe)
function onDrop(e: DragEvent) {
    const cardUuid = e.dataTransfer?.getData('card-uuid')
    if (cardUuid) {
        store.assignCardToSlot(cardUuid, props.slotDef.id)
    }
}

function onDragOver(e: DragEvent) {
    e.preventDefault() // Allow drop
}

function clear() {
    store.clearSlot(props.slotDef.id)
}
</script>

<template>
  <div 
    class="w-full h-full relative group bg-white border-r-2 border-b-2 border-black flex flex-col transition-all box-border"
    :class="{ 'opacity-50 ring-4 ring-primary ring-inset': isDraggingOver }"
    @dragover="onDragOver"
    @drop="onDrop"
    @dragenter="isDraggingOver = true"
    @dragleave="isDraggingOver = false"
  >
      <!-- Occupied State -->
      <div v-if="card" class="absolute inset-0 z-10 flex flex-col">
           <!-- Image Area: flex-grow to push label down -->
          <div class="flex-grow w-full relative overflow-hidden bg-gray-50">
             <img :src="card.meta.coverUrl" class="w-full h-full object-cover object-top" />
             
             <!-- Hover Actions (Subtle) -->
            <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                <button 
                    @click="clear" 
                    class="w-8 h-8 flex items-center justify-center bg-white border-2 border-black text-black rounded-full hover:bg-red-500 hover:text-white hover:border-red-600 transition-colors shadow-sm"
                    title="清除"
                >
                    <div class="i-carbon-trash-can text-lg" />
                </button>
            </div>
          </div>
          
          <!-- Name Tag (Using Grid.vue height: 20px/25px) -->
          <div v-if="showName" class="h-[20px] md:h-[25px] flex-shrink-0 flex items-center justify-center text-center bg-white border-t-2 border-black overflow-hidden px-1 z-10 border-b-0">
              <span class="truncate w-full text-[10px] md:text-sm font-bold text-black leading-none font-serif">{{ card.meta.name }}</span>
          </div>
      </div>

      <!-- Empty State -->
      <div v-else class="flex-1 flex flex-col items-center justify-center gap-1 bg-white relative overflow-hidden">
          <span class="text-6xl text-gray-200 font-light select-none group-hover:text-gray-300 transition-colors">+</span>
      </div>

      <!-- Slot Label (The Soul) -->
      <div 
        class="h-[20px] md:h-[25px] flex-shrink-0 flex items-center justify-center text-center bg-white border-t-2 border-black overflow-hidden px-1 relative z-20 cursor-text hover:bg-gray-50 transition-colors"
        @click.stop="startEdit"
      >
          <input 
             v-if="isEditing"
             ref="editInput"
             :value="slotDef.label"
             @blur="finishEdit"
             @keydown.enter="finishEdit"
             class="w-full h-full text-center bg-transparent outline-none text-[10px] md:text-sm font-bold text-black font-serif p-0 border-none"
          />
          <span v-else class="truncate w-full text-[10px] md:text-sm font-bold text-black leading-none font-serif select-none">
              {{ slotDef.label }}
          </span>
      </div>
  </div>
</template>
