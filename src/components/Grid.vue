<script setup lang="ts">
import { computed } from 'vue'
import type { GridItem } from '~/types'

const props = defineProps<{
  list: GridItem[]
  cols?: number
  forExport?: boolean
}>()

const gridCols = computed(() => props.cols || 5)

const emit = defineEmits(['select-slot'])

function handleSelect(index: number) {
  emit('select-slot', index)
}

function getImageUrl(url: string) {
  if (!url) return ''
  if (props.forExport) {
    // Use proxy for export to ensure CORS headers are correct
    // wsrv.nl is reliable and fast
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png`
  }
  return url
}
</script>

<template>
  <div class="w-full flex justify-center">
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
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }"
    >
      <div
        v-for="(item, index) in list"
        :key="index"
        class="relative border-r-2 border-b-2 border-black cursor-pointer group box-border flex flex-col"
        style="aspect-ratio: 120/187;"
        @click="handleSelect(index)"
      >
        <!-- Character Image -->
        <!-- flex-grow ensures image takes available space minus label -->
        <div class="flex-grow w-full relative overflow-hidden">
          <img 
            v-if="item.character"
            :src="getImageUrl(item.character.image)" 
            class="absolute inset-0 w-full h-full object-cover object-top"
            :loading="forExport ? 'eager' : 'lazy'"
            :crossorigin="forExport ? 'anonymous' : undefined"
          >
          <!-- Empty State Placeholder -->
          <div v-else class="absolute inset-0 bg-white" />
        </div>

        <!-- Label Area (Bottom) -->
        <div class="h-[20px] md:h-[25px] flex-shrink-0 flex items-center justify-center text-center bg-white border-t-2 border-black overflow-hidden px-1">
          <span class="truncate w-full text-[10px] md:text-sm font-bold text-black leading-none">{{ item.label }}</span>
        </div>
        
        <!-- Hover Effect -->
        <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hide scrollbar for cleaner look if desired, but keeping it is better for usability */
</style>
