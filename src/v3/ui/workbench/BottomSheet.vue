<script setup lang="ts">
import { useWorkbench } from '../../platform/workbench/useWorkbench';

const { activePanel, isPanelOpen, closePanel } = useWorkbench();
</script>

<template>
  <!-- Teleport to body to avoid z-index traps -->
  <Teleport to="body">
    <div v-if="activePanel && isPanelOpen" class="mobile-overlay" @click.self="closePanel">
        <div class="bottom-sheet">
            <div class="sheet-handle-bar" @click="closePanel">
                <div class="sheet-handle"></div>
            </div>
            
            <div class="sheet-header">
                <h3>{{ activePanel.title }}</h3>
            </div>
            
            <div class="sheet-content">
                 <component :is="activePanel.component" />
            </div>
        </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mobile-overlay {
    @apply fixed inset-0 bg-black/50 z-[9999] flex flex-col justify-end;
    /* Ensure it sits above everything */
}

.bottom-sheet {
    @apply bg-white w-full rounded-t-2xl shadow-xl flex flex-col;
    max-height: 80vh;
    animation: slide-up 0.3s ease-out;
}

.sheet-handle-bar {
    @apply h-6 flex items-center justify-center cursor-pointer;
}

.sheet-handle {
    @apply w-10 h-1 bg-gray-300 rounded-full;
}

.sheet-header {
    @apply px-4 pb-2 border-b border-gray-100 font-bold text-gray-800;
}

.sheet-content {
    @apply p-4 overflow-y-auto min-h-[50vh];
}

@keyframes slide-up {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}
</style>
