<script setup lang="ts">
import { ref } from 'vue'
import { useGridOS } from '~/stores/gridOS'
import IngestSearch from './IngestSearch.vue'
import type { GridOSCard } from '~/logic/gridos/core/types'

// This Dock acts as a "BoxDock" - items are just piled in
const pinnedCards = ref<GridOSCard[]>([])
const store = useGridOS()

function handleIngestSelect(card: GridOSCard) {
    // Add to local dock list (Transient Stack)
    pinnedCards.value.push(card)
}

function handleDragStart(e: DragEvent, card: GridOSCard) {
    if (e.dataTransfer) {
        // The Protocol: Transfer UUID
        e.dataTransfer.setData('card-uuid', card.uuid)
        e.dataTransfer.effectAllowed = 'copy'
    }
}
</script>

<template>
  <div class="flex flex-col gap-4 h-full">
      <!-- Source Area -->
      <div class="bg-gray-50 dark:bg-gray-900 p-2 rounded-xl border border-gray-200 h-[300px] flex flex-col">
          <h3 class="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Ingest Source</h3>
          <IngestSearch @select="handleIngestSelect" />
      </div>

      <!-- Holding Area (The Dock proper) -->
      <div class="flex-1 flex flex-col min-h-0">
           <h3 class="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Holding Area ({{ pinnedCards.length }})</h3>
           
           <div class="flex-1 overflow-y-auto grid grid-cols-3 gap-2 content-start pr-1">
               <div 
                 v-for="card in pinnedCards" 
                 :key="card.uuid"
                 class="aspect-[2/3] relative rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border border-transparent hover:border-primary shadow-sm hover:shadow-md transition-all group"
                 draggable="true"
                 @dragstart="handleDragStart($event, card)"
               >
                   <img :src="card.meta.coverUrl" class="w-full h-full object-cover" />
                   <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
               </div>
           </div>
      </div>
  </div>
</template>
