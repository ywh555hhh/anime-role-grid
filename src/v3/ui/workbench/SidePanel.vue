<script setup lang="ts">
import { useWorkbench } from '../../platform/workbench/useWorkbench';
import { useEventListener } from '@vueuse/core';
import { ref } from 'vue';

const { activePanel, isPanelOpen, sidePanelSize } = useWorkbench();
const isResizing = ref(false);

const startResize = () => {
    isResizing.value = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
};

// Global Listeners for smoother drag
useEventListener(document, 'mousemove', (e: MouseEvent) => {
    if (!isResizing.value) return;
    // Clamp width between 200px and 600px
    const newWidth = Math.max(200, Math.min(e.clientX - 64, 800)); // -64 for ActivityBar
    sidePanelSize.value = newWidth;
});

useEventListener(document, 'mouseup', () => {
    if (isResizing.value) {
        isResizing.value = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
});
</script>

<template>
  <div 
    v-if="activePanel && isPanelOpen" 
    class="bg-white flex flex-col h-full shrink-0 relative group shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10"
    :style="{ width: sidePanelSize + 'px' }"
  >
      <!-- Material Header: Large, Clean, No border-bottom unless scrolled -->
      <div class="h-16 px-6 flex items-center text-gray-900 shrink-0 select-none">
          <span class="font-medium text-lg tracking-tight">{{ activePanel.title }}</span>
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
          <!-- Dynamic Component Loader -->
          <component :is="activePanel.component" />
      </div>

      <!-- Resize Handle (Subtle) -->
      <div 
         class="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-pink-100 transition-colors z-50 translate-x-[2px]"
         :class="{ 'bg-pink-400': isResizing }"
         @mousedown.prevent="startResize"
      ></div>
  </div>
</template>

<style scoped>
/* Scrollbar handled by global utility */
</style>
