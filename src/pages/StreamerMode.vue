<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LAYOUT_PRESETS } from '~/logic/gridos/layouts'
import type { GridOSCard } from '~/logic/gridos/core/types'

// GridOS Components
import GridOSDock from '~/components/gridos/GridOSDock.vue'
import StackDock from '~/components/gridos/StackDock.vue'
import GridOSCanvas from '~/components/gridos/GridOSCanvas.vue'
import IngestSearch from '~/components/gridos/IngestSearch.vue'
import IngestLocal from '~/components/gridos/IngestLocal.vue'

const router = useRouter()

// UI State
const isDockOpen = ref(true)
const currentLayoutId = ref('grid_3x3')
const currentLayout = ref(LAYOUT_PRESETS[currentLayoutId.value])
const showNames = ref(true)
const zoomLevel = ref(1) // Default Zoom

// Polymorphic State
const ingestMode = ref<'search' | 'local'>('search')
const dockMode = ref<'grid' | 'stack'>('grid')

// Global "Hand" (Cards held in the session)
// In a real app, this might be in the store, but here the Page acts as the "Context"
const sessionCards = ref<GridOSCard[]>([])

function handleIngest(card: GridOSCard) {
    sessionCards.value.push(card)
}

function switchLayout(id: string) {
    if (LAYOUT_PRESETS[id]) {
        currentLayoutId.value = id
        currentLayout.value = LAYOUT_PRESETS[id]
    }
}
</script>

<template>
  <div class="fixed inset-0 w-full h-full bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
    
    <!-- Top Bar (Minimal) -->
    <div class="h-12 bg-white dark:bg-gray-800 border-b flex items-center px-4 justify-between z-10 shrink-0">
        <div class="flex items-center gap-2">
            <button @click="router.push('/')" class="p-1 hover:bg-gray-100 rounded-lg">
                <div class="i-carbon-home text-lg" />
            </button>
            <span class="font-serif font-bold tracking-widest">GridOS <span class="text-xs text-primary bg-primary/10 px-1 rounded">MVP</span></span>
        </div>
        
        <div class="flex items-center gap-4">
             <!-- Zoom Controls -->
             <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                 <button @click="zoomLevel = Math.max(0.5, zoomLevel - 0.1)" class="w-8 h-8 flex items-center justify-center hover:bg-white rounded shadow-sm transition-all"><div class="i-carbon-subtract" /></button>
                 <span class="text-xs font-bold w-12 text-center tabular-nums">{{ Math.round(zoomLevel * 100) }}%</span>
                 <button @click="zoomLevel = Math.min(2, zoomLevel + 0.1)" class="w-8 h-8 flex items-center justify-center hover:bg-white rounded shadow-sm transition-all"><div class="i-carbon-add" /></button>
             </div>

            <!-- Layout Switcher -->
             <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1.5 px-3">
                 <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Template</span>
                 <select 
                    :value="currentLayoutId"
                    @change="(e) => switchLayout((e.target as HTMLSelectElement).value)"
                    class="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                 >
                    <optgroup label="Grid Layouts">
                        <option value="grid_3x3">Standard 3x3</option>
                        <option value="grid_4x4">Large 4x4</option>
                    </optgroup>
                    <optgroup label="Tier Lists">
                        <option value="tier_basic">Basic (S/A)</option>
                        <option value="tier_full">Full (S-D)</option>
                    </optgroup>
                 </select>
             </div>
             
             <!-- Visual Toggles -->
             <button 
                @click="showNames = !showNames"
                class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors tooltip-trigger relative group"
                :class="showNames ? 'text-primary bg-primary/5' : 'text-gray-400'"
                title="Toggle Character Names"
             >
                 <div class="i-carbon-text-font font-bold text-lg" />
             </button>
             
             <!-- Toggle Dock -->
             <button 
                @click="isDockOpen = !isDockOpen"
                class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :class="isDockOpen ? 'text-primary' : 'text-gray-400'"
             >
                 <div class="i-carbon-catalog text-lg" />
             </button>
        </div>
    </div>

    <!-- Main Workspace -->
    <div class="flex-1 relative flex overflow-hidden">
        
        <!-- The Stage (Canvas) -->
        <div class="flex-1 relative bg-dot-pattern flex items-center justify-center p-8 overflow-hidden">
             <!-- Zoom Wrapper with strict sharpening -->
             <div 
                class="transition-transform duration-200 ease-out origin-center will-change-transform backface-hidden"
                :style="{ transform: `scale(${zoomLevel})` }"
             >
                 <GridOSCanvas 
                    :layout="currentLayout" 
                    :show-names="showNames"
                    :title="currentLayout.name" 
                    class="shadow-none" 
                 />
             </div>
        </div>

        <!-- The Dock (Polymorphic Panel) -->
        <div 
            class="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-20 transition-all duration-300 transform flex flex-col"
            :class="isDockOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'"
        >
             <div class="p-4 border-b dark:border-gray-700 font-bold flex justify-between items-center shrink-0">
                <span>Ecosystem</span>
                <button @click="isDockOpen = false"><div class="i-carbon-close" /></button>
             </div>
             
             <!-- 1. Source Layer -->
             <div class="p-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
                 <div class="flex justify-between items-center mb-2">
                     <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Data Source</span>
                     <div class="flex bg-gray-100 dark:bg-gray-700 rounded p-1 text-[10px] font-bold">
                         <button @click="ingestMode = 'search'" class="px-2 py-1 rounded" :class="ingestMode === 'search' ? 'bg-white shadow text-primary' : ''">Bangumi</button>
                         <button @click="ingestMode = 'local'" class="px-2 py-1 rounded" :class="ingestMode === 'local' ? 'bg-white shadow text-primary' : ''">Local</button>
                     </div>
                 </div>
                 
                 <!-- Ingest Component Switcher -->
                 <div class="h-40">
                     <KeepAlive>
                        <IngestSearch v-if="ingestMode === 'search'" @select="handleIngest" key="search" />
                        <IngestLocal v-else-if="ingestMode === 'local'" @select="handleIngest" key="local" />
                     </KeepAlive>
                 </div>
             </div>

             <!-- 2. Container Layer -->
             <div class="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900/50">
                 <div class="p-4 pb-2 flex justify-between items-center">
                     <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Dock Container</span>
                     <div class="flex gap-2">
                         <button @click="dockMode = 'grid'" title="Grid View" :class="dockMode === 'grid' ? 'text-primary' : 'text-gray-400'"><div class="i-carbon-grid" /></button>
                         <button @click="dockMode = 'stack'" title="Stack View" :class="dockMode === 'stack' ? 'text-primary' : 'text-gray-400'"><div class="i-carbon-layers" /></button>
                     </div>
                 </div>
                 
                 <div class="flex-1 overflow-hidden relative">
                     <!-- 
                        We pass the SAME sessionCards data to different visualizers.
                        This proves "Data as Water" - the data doesn't change, only the container.
                     -->
                     <div v-if="dockMode === 'grid'" class="h-full overflow-y-auto p-4">
                         <!-- Reusing GridOSDock logic but ideally we'd refactor it to accept props too. 
                              For now, GridOSDock manages its own state, so let's stick to the Ingest->Parent->Prop flow for the StackDock demo 
                              or refactor GridOSDock to be 'dumb'. 
                              Let's use a simple v-for here for the 'Grid' mode to act as the counterpart to StackDock
                          -->
                          <div class="grid grid-cols-3 gap-2">
                                <div 
                                    v-for="card in sessionCards" 
                                    :key="card.uuid"
                                    class="aspect-[2/3] rounded-lg overflow-hidden cursor-grab shadow-sm border border-gray-200 bg-white"
                                    draggable="true"
                                    @dragstart="(e) => { e.dataTransfer?.setData('card-uuid', card.uuid) }"
                                >
                                    <img :src="card.meta.coverUrl" class="w-full h-full object-cover" />
                                </div>
                          </div>
                     </div>
                     
                     <StackDock v-else :cards="sessionCards" />
                 </div>
             </div>
        </div>

        <!-- Dock Trigger (When Closed) -->
        <button 
            v-if="!isDockOpen"
            @click="isDockOpen = true"
            class="absolute right-4 bottom-4 bg-primary text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform z-30"
        >
            <div class="i-carbon-catalog text-xl" />
        </button>
    </div>

  </div>
</template>

<style scoped>
.bg-dot-pattern {
  background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
  background-size: 20px 20px;
}
.dark .bg-dot-pattern {
  background-image: radial-gradient(#374151 1px, transparent 1px);
}
.backface-hidden {
    backface-visibility: hidden;
    -webkit-font-smoothing: subpixel-antialiased;
}
</style>
