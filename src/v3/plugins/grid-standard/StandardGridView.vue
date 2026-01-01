<script setup lang="ts">
import { ref, computed } from 'vue';
import { getEcsRegistry } from '../../platform/loader';
import { overlays } from '../../platform/services/OverlayManager';
import { presetService } from '../../platform/services/PresetService'; // Added for Name
import SearchOverlay from '../../ui/overlays/SearchOverlay.vue';
import PresetGalleryOverlay from '../../ui/overlays/PresetGalleryOverlay.vue';

// --- V1 Aesthetic Constants ---
const CARD_WIDTH = 120;
const CARD_HEIGHT = 212;

// --- State ---
const registry = getEcsRegistry();

const currentPresetName = computed(() => {
    return presetService.currentPreset.value?.name;
});

// Reactive Query: Get all entities with Layout + Visual
// Helper to turn Set<EntityId> into Array of reactive objects
const slots = computed(() => {
    // 1. Query
    // Note: registry.query returns a Set. 
    // We rely on the fact that registry internals are reactive so accesses inside computed trigger re-run.
    const ids = Array.from(registry.query(['Layout', 'Visual']));
    
    // 2. Map to Data
    const items = ids.map(id => {
        const layout = registry.getComponent(id, 'Layout');
        const visual = registry.getComponent(id, 'Visual');
        const meta = registry.getComponent(id, 'Meta');
        return {
            id,
            layout,
            visual,
            meta
        };
    });

    // 3. Sort by Order
    // Ensure layout exists and has order property (It should via types now)
    return items.sort((a, b) => (a.layout?.order ?? 0) - (b.layout?.order ?? 0));
});

const props = defineProps<{
    cols?: number;
    title?: string;
    customTitle?: string;
    defaultTitle?: string;
    showCharacterName?: boolean;
    modeIsCustom?: boolean;
    fillerName?: string;
}>();

// --- Interaction ---
const handleSlotClick = async (slot: any) => {
    try {
        console.log('[Grid] Clicking Slot:', slot.id);
        
        // Open Search Overlay
        const result = await overlays.open(SearchOverlay, {
            initialQuery: slot.meta?.name === `Slot ${slot.layout.order}` ? '' : slot.meta?.name,
            searchType: 'character'
        });

        if (result) {
            console.log(`[Grid] Writing to ECS:`, result);
            
            // DIRECT WRITE (Phase 3.3 Goal)
            // Update Visual
            registry.addComponent(slot.id, 'Visual', {
                ...slot.visual,
                src: result.image,
                label: result.name
            });
            
            // Update Meta
            registry.addComponent(slot.id, 'Meta', {
                ...slot.meta,
                name: result.name,
                originId: result.meta.id
            });
            
            overlays.alert(`已填充: ${result.name}`);
        }
    } catch (e) {
        console.log('Search cancelled');
    }
};

const handleOpenGallery = () => { // Added function
    overlays.open(PresetGalleryOverlay);
};

const getTitleStyle = (text: string) => {
    // ...
    const len = text.length;
    let size = 20;
    if (len > 8) size = 16;
    if (len > 12) size = 14;
    return { fontSize: `${size}px` };
};

</script>

<template>
  <div class="flex flex-col items-center bg-white p-6 shadow-sm w-full select-none rounded-xl">
     <!-- 1. Header (V1 Style) -->
     <header class="w-full mb-6 text-center relative flex flex-col items-center gap-2">
          <!-- Main Title -->
          <h1 
             class="font-bold tracking-widest text-black text-2xl md:text-4xl px-4 py-2 border-b-2 border-transparent hover:border-gray-200 transition-colors cursor-text"
             style="font-family: 'Noto Serif SC', serif;"
          >
             {{ customTitle || defaultTitle || '我的二次元成分表' }}
          </h1>

          <!-- Template Name (Pink Subtitle) -->
          <h2 
            class="text-xl font-bold text-[#e4007f] tracking-widest cursor-pointer hover:underline hover:scale-105 transition-all flex items-center gap-2 group"
            style="font-family: 'Noto Serif SC', serif;"
            @click="handleOpenGallery"
          >
            <span>— {{ currentPresetName || '基础模板' }} —</span>
            <span class="text-xs opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 font-sans font-normal">(切换模板)</span>
          </h2>
     </header>

     <!-- 2. The Grid (V1 Ratio) -->
     <div 
        class="grid border-t-2 border-l-2 border-black bg-black mx-auto box-content shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
        :style="{
            gridTemplateColumns: `repeat(${cols || 3}, ${CARD_WIDTH}px)`,
            maxWidth: '100%'
        }"
     >
         <!-- Real Slots from ECS -->
         <div 
             v-for="slot in slots" 
             :key="slot.id"
             class="relative bg-white border-r-2 border-b-2 border-black box-border group overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors flex flex-col"
             :style="{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }"
             @click="handleSlotClick(slot)"
         >
             <!-- 1. Image Content (Flex Grow) -->
             <div class="flex-grow w-full relative overflow-hidden bg-white">
                 <img 
                    v-if="slot.visual?.src" 
                    :src="slot.visual.src" 
                    class="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                 />
                 <!-- Empty Placeholder: Pure White -->
                 <div v-else class="absolute inset-0 w-full h-full bg-white"></div>
                 
                 <!-- Hover Effect -->
                 <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
             </div>


             <!-- 2. Label (Bottom Block, V1 Style) -->
             <div 
                v-if="true"
                class="h-[25px] flex-shrink-0 flex items-center justify-center text-center bg-white border-t-2 border-black overflow-hidden px-1"
             >
                 <span 
                    class="truncate w-full font-bold text-black leading-none"
                    :style="getTitleStyle(slot.visual?.label || '')"
                 >
                    {{ slot.visual?.label }}
                 </span>
             </div>
         </div>
     </div>
     
     <!-- 3. Footer -->
      <footer class="mt-6 text-gray-400 text-xs font-serif flex items-center gap-2">
         <div class="w-12 h-px bg-gray-300"></div>
         <span>GENERATED BY ANIME-GRID</span>
         <div class="w-12 h-px bg-gray-300"></div>
     </footer>
  </div>
</template>

<style scoped>
/* Force Songti for "Magazine Feel" */
:deep(.font-serif) {
    font-family: 'Noto Serif SC', serif;
}
</style>
