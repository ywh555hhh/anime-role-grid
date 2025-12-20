<script setup lang="ts">
import { ref } from 'vue'
import { api } from '~/services/api'
import { useGridOS } from '~/stores/gridOS'
import type { GridOSCard } from '~/logic/gridos/core/types'

// Props
const props = defineProps<{
    mode?: 'character' | 'subject'
}>()

const emit = defineEmits<{
    (e: 'select', card: GridOSCard): void
    (e: 'drag-start', card: GridOSCard): void
}>()

const store = useGridOS()

// Local State
const query = ref('')
const loading = ref(false)
const results = ref<GridOSCard[]>([])

// Search Action
async function handleSearch() {
    if (!query.value) return
    loading.value = true
    results.value = []
    
    try {
        const res = await api.searchBangumi(query.value)
        // Transform to GridOS Card
        results.value = res.map((item: any) => ({
             uuid: crypto.randomUUID(), // Generate transient UUID for selection
             meta: {
                 name: item.name,
                 coverUrl: item.images?.grid || item.images?.small || '',
                 origin: 'bangumi'
             },
             payload: item
        }))
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

function selectCard(card: GridOSCard) {
    // Register to kernel
    // We should regenerate UUID to ensure unique instance if picked multiple times?
    // For now, assume Ingest generates a fresh instance.
    const freshCard = { ...card, uuid: crypto.randomUUID() }
    store.registerCard(freshCard)
    emit('select', freshCard)
}
</script>

<template>
  <div class="h-full flex flex-col p-1">
       <!-- Quick Search Bar -->
       <div class="flex gap-2 mb-3">
           <input 
             v-model="query" 
             @keydown.enter="handleSearch"
             placeholder="Search Bangumi..." 
             class="flex-1 bg-white border-2 border-black px-3 py-1.5 text-xs font-bold outline-none focus:bg-yellow-50 placeholder-gray-400"
           />
           <button 
             @click="handleSearch" 
             class="bg-black text-white px-3 py-1.5 border-2 border-black hover:bg-gray-800 transition-colors flex items-center justify-center"
           >
                <div v-if="loading" class="i-carbon-circle-dash animate-spin text-sm" />
                <div v-else class="i-carbon-search text-sm" />
           </button>
       </div>

       <!-- Full Search Trigger -->
       <!-- Note: In a real app we'd emit 'open-full-search' but here we just stick to sidebar for MVP -->
       
       <!-- Results List -->
       <div class="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            <div 
                v-for="card in results" 
                :key="card.uuid"
                class="flex items-center gap-3 p-1.5 border-2 border-transparent hover:border-black hover:bg-white bg-gray-50 transition-all cursor-move group select-none"
                @click="selectCard(card)"
                draggable="true" 
                @dragstart="$emit('drag-start', card)"
            >
                <!-- Image -->
                <div class="w-10 h-10 border border-black shrink-0 relative">
                     <img :src="card.meta.coverUrl" class="w-full h-full object-cover object-top" />
                </div>
                
                <!-- Info -->
                <div class="flex-1 min-w-0 flex flex-col justify-center">
                    <div class="font-bold text-xs truncate leading-tight">{{ card.meta.name }}</div>
                    <div class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">{{ card.meta.origin }}</div>
                </div>

                <!-- Add Icon -->
                <div class="i-carbon-add text-black opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <div v-if="results.length === 0 && !loading" class="flex flex-col items-center justify-center py-8 opacity-40">
                <div class="i-carbon-search text-2xl mb-1" />
                <span class="text-[10px] font-bold">NO RESULTS</span>
            </div>
       </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #000;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background-color: transparent;
}
</style>
