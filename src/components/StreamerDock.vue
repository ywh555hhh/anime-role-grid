<script setup lang="ts">
import { ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useGridStore } from '~/stores/gridStore'

const gridStore = useGridStore()
const { dockItems, removeFromDock, clearDock, isToolbarOpen } = gridStore

// Trash Logic: Accept drops to delete
const trashList = ref([]) 
function onTrashAdd(evt: any) {
    trashList.value = [] // Auto-empty to keep it clean
    
    // If dragged from Dock, we need to manually remove it because Dock uses pull:'clone'
    const id = evt.item.dataset.id
    if (id) {
        const idx = dockItems.value.findIndex(i => i.id == id || i.id == Number(id))
        if (idx !== -1) {
             removeFromDock(idx)
        }
    }
}

// Mobile Shake Mode (Long Press)
const isDeleteMode = ref(false)

</script>

<template>
  <div 
    class="z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-2xl border-gray-200 dark:border-gray-700 transition-all duration-300 flex"
    :class="[
      // Mobile: Bottom Drawer - Taller (h-48) for double row history
      'w-full h-48 border-t flex-row items-center px-4 gap-4 shrink-0 order-last',
      // Desktop: Right Sidebar
      // Desktop: Right Sidebar (Widened to w-60 for Double Column)
      'md:order-last md:w-60 md:h-full md:border-l md:border-t-0 md:flex-col md:py-6 md:px-3 md:items-center md:gap-4'
    ]"
  >
    
    <!-- Actions Group (Undo/Redo/Add/Toggle/Trash) -->
    <!-- Mobile: Vertical stack on right. Desktop: Horizontal row at bottom? No, Desktop sidebar flow. -->
    


    <!-- Dock Scroller -->
    <div class="flex-1 overflow-auto min-w-0 min-h-0 w-full no-scrollbar">
         <VueDraggable
            v-model="dockItems"
            :group="{ name: 'grid', pull: 'clone', put: false }"
            :sort="false"
            :forceFallback="true"
            class="grid grid-rows-2 grid-flow-col auto-cols-max md:grid md:grid-flow-row md:grid-cols-2 md:auto-rows-min gap-3 p-1 min-h-full content-start"
            ghost-class="sortable-ghost"
         >
            <div
                v-for="(item, index) in dockItems"
                :key="item.id"
                :data-id="item.id"
                class="relative group shrink-0 cursor-grab active:cursor-grabbing transition-transform flex justify-center"
                :class="isDeleteMode ? 'animate-shake' : 'hover:scale-105'"
                @contextmenu.prevent="isDeleteMode = !isDeleteMode"
            >
                <!-- Image -->
                <div class="w-16 h-16 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 border-white shadow-md relative bg-gray-100">
                    <img 
                        :src="item.image" 
                        class="w-full h-full object-cover object-top pointer-events-none" 
                    />
                    <!-- Name Tag (Overlay) -->
                    <div class="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] md:text-xs font-bold text-center truncate px-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                        {{ item.name }}
                    </div>
                </div>
                
                <!-- Quick Delete (Hover / Shake Mode) -->
                <button
                    class="dock-delete-btn absolute top-1 right-1 bg-primary text-white rounded-full p-1 transition-all transform shadow-sm z-10"
                    :class="[
                        isDeleteMode ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100' 
                    ]"
                    @click.stop="removeFromDock(index)"
                    title="删除"
                >
                    <div i-carbon-close class="text-xs" />
                </button>
            </div>
         </VueDraggable>
    </div>

    <!-- Divider (Desktop only) -->
    <div class="hidden md:block w-8 h-px bg-gray-300 shrink-0 my-2" />

    <!-- Mobile Right Actions / Desktop Bottom Actions -->
    <div class="shrink-0 flex flex-col md:grid md:grid-cols-3 items-center gap-2 w-[18%] md:w-full md:pb-4 justify-items-center">
        
        <!-- Add Button -->
        <button 
            class="w-10 h-10 md:w-full md:h-12 rounded-xl bg-primary hover:bg-primary-hover text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            id="dock-add-btn"
            @click="$emit('open-search')"
            title="添加角色"
        >
            <div i-carbon-add class="text-xl md:text-2xl font-bold" />
        </button>

        <!-- Tool Toggle -->
        <button 
            class="w-10 h-10 md:w-full md:h-12 rounded-xl border-2 transition-all flex items-center justify-center hover:scale-105 active:scale-95"
            :class="isToolbarOpen ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 hover:border-black'"
            @click="isToolbarOpen = !isToolbarOpen"
            title="切换工具栏"
        >
            <div i-carbon-settings class="text-xl md:text-xl" />
        </button>

        <!-- Trash Zone -->
        <VueDraggable
            v-model="trashList"
            :group="{ name: 'grid', put: true, pull: false }" 
            class="relative flex items-center justify-center w-10 h-10 md:w-full md:h-12"
            ghost-class="hidden-ghost"
            @add="onTrashAdd"
        >
            <button 
                class="absolute inset-0 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors w-full h-full border-2 border-dashed border-gray-300 rounded-xl hover:border-red-500 hover:bg-red-50"
                @click="clearDock"
                title="清空暂存区 / 拖入删除"
            >
                <div i-carbon-trash-can class="text-xl pointer-events-none" />
            </button>
        </VueDraggable>

    </div>

  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
.sortable-ghost {
    opacity: 0.4;
    filter: grayscale(100%);
}
:deep(.hidden-ghost) {
    display: none;
}

@keyframes shake {
  0%, 100% { transform: translate3d(0, 0, 0); }
  10%, 90% { transform: translate3d(-1px, 0, 0) rotate(-1deg); }
  20%, 80% { transform: translate3d(2px, 0, 0) rotate(2deg); }
  30%, 50%, 70% { transform: translate3d(-2px, 0, 0) rotate(-2deg); }
  40%, 60% { transform: translate3d(2px, 0, 0) rotate(2deg); }
}
.animate-shake {
    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both infinite;
}

/* Hide delete button when dragging */
:global(.sortable-drag .dock-delete-btn),
:global(.sortable-ghost .dock-delete-btn) {
    display: none !important;
}
</style>
