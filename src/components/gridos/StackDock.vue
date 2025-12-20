<script setup lang="ts">
import { ref, computed } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import type { GridOSCard, DockStrategy } from '~/logic/gridos/core/types'

const props = defineProps<{
    cards: GridOSCard[],
    strategy?: DockStrategy
}>()

const emit = defineEmits<{
    (e: 'update:cards', cards: GridOSCard[]): void
    (e: 'remove', card: GridOSCard): void
}>()

// Deletion State
const isDeleteMode = ref(false)

// Use a computed writable ref for v-model
const list = computed({
    get: () => props.cards,
    set: (val) => emit('update:cards', val)
})

function removeCard(index: number) {
    const card = props.cards[index]
    emit('remove', card)
}
</script>

<template>
  <div class="h-full flex flex-col relative select-none">
       <!-- Header -->
       <div class="flex items-center justify-between mb-2">
           <h3 class="text-xs font-black uppercase tracking-widest text-gray-400 font-serif">Deck</h3>
           <button 
             class="text-xs font-bold px-2 py-0.5 border-2 rounded transition-all"
             :class="isDeleteMode ? 'bg-red-500 text-white border-red-500 blink' : 'text-gray-400 border-gray-200 hover:border-black hover:text-black'"
             @click="isDeleteMode = !isDeleteMode"
           >
             {{ isDeleteMode ? 'DONE' : 'EDIT' }}
           </button>
       </div>

       <!-- The Stack -->
       <div class="flex-1 w-full relative perspective-1000 flex items-center justify-center">
            <VueDraggable
                v-model="list"
                group="grid"
                class="w-full h-full relative"
                :disabled="isDeleteMode" 
            >
                <div 
                   v-for="(card, index) in cards" 
                   :key="card.uuid"
                   class="absolute w-full aspect-[2/3] bg-white border-2 border-black shadow-sm transition-all duration-300 ease-out origin-bottom transform-gpu group"
                   :class="{ 'animate-shake': isDeleteMode }"
                   :style="{
                       top: `${index * 2}px`,
                       left: `${index * 2}px`,
                       zIndex: index,
                       transform: `rotate(${(index % 2 === 0 ? 1 : -1) * (index * 0.5)}deg)`
                   }"
                >
                    <img :src="card.meta.coverUrl" class="w-full h-full object-cover object-top pointer-events-none" />
                    
                    <!-- Delete Button (Overlay) -->
                    <button 
                        v-if="isDeleteMode"
                        class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-md z-50 hover:scale-110 transition-transform"
                        @click.stop="removeCard(index)"
                    >
                        <div class="i-carbon-close text-xs select-none pointer-events-none" />
                    </button>

                    <!-- Name Tag (Only on top card or hover) -->
                    <div class="absolute bottom-0 w-full bg-white border-t-2 border-black text-[10px] p-1 font-bold text-center truncate pointer-events-none">
                         {{ card.meta.name }}
                    </div>
                </div>
            </VueDraggable>

            <!-- Empty State -->
            <div v-if="cards.length === 0" class="absolute inset-0 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <span class="text-xs text-gray-400 font-bold">EMPTY</span>
            </div>
       </div>
  </div>
</template>

<style scoped>
.perspective-1000 {
    perspective: 1000px;
}
@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-2deg); }
  75% { transform: rotate(2deg); }
}
.animate-shake {
    animation: shake 0.3s ease-in-out infinite;
}
.blink {
    animation: blink 1s infinite;
}
@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
</style>
