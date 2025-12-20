<script setup lang="ts">
import { computed } from 'vue'
import { useGridOS } from '~/stores/gridOS'
import type { GridOSLayout, GridOSSlot } from '~/logic/gridos/core/types'
// We need a helper to render a slot
import GridOSSlotRenderer from './GridOSSlotRenderer.vue' 

const props = defineProps<{
    layout: GridOSLayout,
    showNames?: boolean,
    title?: string,
    customTitle?: string
}>()

const store = useGridOS()

function updateSlotLabel(slotId: string, newLabel: string) {
    const slot = props.layout.slots.find(s => s.id === slotId)
    if (slot) {
        slot.label = newLabel
    }
}

</script>

<template>
  <div class="flex flex-col items-center w-full transition-all duration-300">
      <!-- Header Area (Scaling with Canvas) -->
      <div v-if="title || customTitle" class="mb-4 text-center select-none">
          <h1 
            class="text-4xl md:text-5xl font-black text-black mb-2"
            style="font-family: 'Noto Serif SC', serif; text-shadow: 2px 2px 0px rgba(0,0,0,0.1);"
          >
              {{ customTitle || 'MY ROLE GRID' }}
          </h1>
          <h2 
            v-if="title"
            class="text-lg md:text-xl font-bold text-gray-500 tracking-widest uppercase font-serif"
          >
              {{ title }}
          </h2>
      </div>

      <!-- Renderer: Grid (CSS Grid) -->
      <div 
        v-if="layout.id.startsWith('grid')" 
        class="grid border-t-2 border-l-2 border-black bg-white mx-auto box-content"
        :style="{ 
            gridTemplateColumns: `repeat(${layout.slots.length === 9 ? 3 : 4}, minmax(0, 1fr))`,
            width: 'auto',
            boxShadow: '10px 10px 0 0 rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
        }"
      >
          <div 
            v-for="slot in layout.slots" 
            :key="slot.id"
            class="relative box-border"
            :style="{ 
                width: '120px', 
                height: showNames ? '212px' : '187px' 
            }"
          >
              <GridOSSlotRenderer 
                :slot-def="slot" 
                :show-name="showNames"
                @update:label="(val) => updateSlotLabel(slot.id, val)"
              />
          </div>
      </div>
      
      <!-- Other Layouts (Not supported in strict clone mode) -->
      <div v-else class="text-red-500 font-bold mt-8 border-2 border-red-500 p-4 rounded bg-red-50">
          Layout not supported in strict clone mode
      </div>
  </div>
</template>
