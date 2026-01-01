<script setup lang="ts">
import { overlays, type OverlayTask } from '../../platform/services/OverlayManager';

const stack = overlays.stack;

function handleBackdropClick(task: OverlayTask) {
    if (task.options.closeOnBackdrop) {
        overlays.close(task.id);
    }
}
</script>

<template>
  <div class="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <TransitionGroup name="overlay">
          <div 
             v-for="task in stack" 
             :key="task.id"
             class="absolute inset-0 flex items-center justify-center pointer-events-auto"
             :style="{ zIndex: task.options.priority }"
          >
              <!-- Backdrop -->
              <div 
                v-if="task.options.backdrop" 
                class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                @click="handleBackdropClick(task)"
              />

              <!-- Content Wrapper -->
              <div 
                class="relative z-10 max-w-full max-h-full overflow-auto flex flex-col"
                :class="{
                    'items-center justify-center': task.options.position === 'center',
                    'items-center justify-end h-full w-full': task.options.position === 'bottom', // Bottom Sheet style
                    'items-center justify-start h-full w-full pt-10': task.options.position === 'top',
                }"
              >
                 <component 
                    :is="task.component" 
                    v-bind="task.props"
                    @close="(res: any) => overlays.close(task.id, res)"
                 />
              </div>
          </div>
      </TransitionGroup>
  </div>
</template>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
