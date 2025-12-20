<script setup lang="ts">
import { ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useGridStore } from '~/stores/gridStore'

const gridStore = useGridStore()
const { dockItems, removeFromDock, clearDock, isToolbarOpen, isDragging, resolveImage } = gridStore

// Trash Logic: Accept drops to delete
const trashList = ref([]) 
function onTrashAdd(evt: any) {
    trashList.value = [] // Auto-empty to keep it clean
    
    // Logic: Only remove from Dock if the item CAME from the Dock.
    // If it came from the Grid, the Grid's "pull: true" or "pull: move" (default for same group usually) 
    // combined with the fact it was dropped here means it's gone from Grid.
    // We just need to ensure we don't ALSO delete it from Dock if it happens to match an ID.
    
    // We check the source element ID. We will add id="dock-list" to the dock VueDraggable.
    if (evt.from.id === 'dock-list') {
        const id = evt.item.dataset.id
        if (id) {
            const idx = dockItems.value.findIndex(i => i.id == id || i.id == Number(id))
            if (idx !== -1) {
                 removeFromDock(idx)
            }
        }
    }
}

// Mobile Shake Mode (Long Press)
const isDeleteMode = ref(false)

const dragOptions = {
    animation: 200,
    group: { name: 'grid', pull: 'clone' as const, put: false },
    sort: false,
    forceFallback: true, // "THE" Solution
    fallbackClass: 'dock-drag-fallback',
    fallbackOnBody: true, // Essential for "sticky" z-index behavior
    touchStartThreshold: 5,
    filter: '.dock-delete-btn', // Prevent drag on delete button
    preventOnFilter: false // Allow click event to pass through
}

</script>

<template>
  <div 
    id="streamer-dock"
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
    


    <!-- Dock Branding (Desktop Streamer Only) -->
    <div class="hidden md:flex px-6 py-6 border-b border-gray-100 dark:border-gray-800 bg-transparent shrink-0 flex-col items-center gap-2 select-none">
        <h1 class="text-xl font-black text-gray-900 dark:text-gray-100 tracking-widest" style="font-family: 'Noto Serif SC', serif;">
            【我推<span class="text-primary">的</span>格子】
        </h1>
        <a href="https://oshigrid.me" target="_blank" class="text-xs text-gray-400 font-mono hover:text-primary transition-colors tracking-wide">oshigrid.me</a>
        
        <!-- Social Links (Reliable SVGs) -->
        <div class="flex items-center gap-6 mt-2 opacity-60 hover:opacity-100 transition-opacity">
             <a href="https://qun.qq.com/universal-share/share?ac=1&authKey=axd5YDW0i5ZiyX8jTultFRVHCHv9FAsCnqHq40itBLuQEoUOdCo06bAh05W%2Bv1c7&busi_data=eyJncm91cENvZGUiOiIxMDU1NTkxMDY0IiwidG9rZW4iOiJMazMxZ1pPZHdQejMyS1BaSFZ2UkJIdHp5b29NbTI4VU9NaGhSSW96T0NpcS9ha0oyZzJEVmpPRXZ1Nit2eTVNIiwidWluIjoiMTkxNjY0NzYxNiJ9&data=Tsay2nkLgPoS1UGFPbFnpdAsQeLPgFErKFco7mYPmWPldhqQme_u6smVnM0ifq8X5nO5TiLUbxgl57S9deOLIw&svctype=4&tempid=h5_group_info" target="_blank" title="QQ群" class="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                 <!-- QQ SVG -->
                 <svg class="w-4.5 h-4.5" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.2 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.3-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z" /></svg>
             </a>
             <a href="https://space.bilibili.com/36078469" target="_blank" title="B站" class="text-gray-600 dark:text-gray-400 hover:text-[#00AEEC] transition-colors">
                 <!-- Bilibili SVG -->
                 <svg class="w-4.5 h-4.5" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M777.514667 131.669333a53.333333 53.333333 0 0 0-48.426667 26.965334l-50.816 87.168a483.2 483.2 0 0 0-166.4-29.226667c-58.453333 0-114.346667 10.197333-167.082667 29.354667l-50.176-87.296a53.333333 53.333333 0 0 0-93.610666 52.138666L246.229333 289.834667c-112.554667 64.938667-189.696 182.997333-197.888 320.128-0.554667 9.173333-0.853333 18.261333-0.853333 27.264 0 6.058667 0.170667 12.16 0.469333 18.218666 6.058667 134.4 81.365333 249.514667 189.610667 312.362667a476.330667 476.330667 0 0 0 549.973333 0.256c108.416-62.805333 183.936-177.877333 190.122667-312.576 0.298667-6.058667 0.426-12.202667 0.426-18.261333 0-8.96-0.341333-17.962667-0.938667-27.050667-8.192-137.216-85.333333-255.488-197.930666-320.384l45.226666-78.122666a53.333333 53.333333 0 0 0-46.933333-80.042667zM337.024 624.128c-30.848 0-55.850667-27.605333-55.850667-61.696s25.002667-61.696 55.850667-61.696c30.848 0 55.850667 27.605333 55.850666 61.696s-25.002667 61.696-55.850666 61.696z m352.085333 0c-30.848 0-55.850667-27.605333-55.850666-61.696s25.002667-61.696 55.850666-61.696c30.848 0 55.850667 27.605333 55.850667 61.696s-25.002667 61.696-55.850667 61.696z" /></svg>
             </a>
             <a href="https://discord.gg/8xF22PN4jW" target="_blank" title="Discord" class="text-gray-600 dark:text-gray-400 hover:text-[#5865F2] transition-colors">
                 <div class="i-carbon-logo-discord text-lg" />
             </a>
        </div>
    </div>

    <!-- Dock Scroller -->
    <div class="flex-1 overflow-auto min-w-0 min-h-0 w-full no-scrollbar relative">
         <!-- Empty State -->
         <div v-if="dockItems.length === 0" class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
             <div class="i-carbon-upload text-3xl mb-1 animate-bounce" />
             <span class="text-xs font-bold">点击右侧按钮添加角色</span>
         </div>

         <VueDraggable
            id="dock-list"
            v-model="dockItems"
            v-bind="dragOptions"
            class="grid grid-rows-2 grid-flow-col auto-cols-max gap-2 p-2 h-full w-max min-w-full content-start items-start md:grid-rows-none md:grid-flow-row md:grid-cols-2 md:auto-rows-min md:w-full md:h-auto md:min-w-0"
            ghost-class="sortable-ghost"
            @start="isDragging = true"
            @end="isDragging = false"
         >
            <div
                v-for="(item, index) in dockItems"
                :key="item.id"
                :data-id="item.id"
                class="relative group shrink-0 cursor-grab active:cursor-grabbing transition-transform transition-shadow duration-200 flex justify-center select-none rounded-lg"
                :class="isDeleteMode ? 'animate-shake' : 'hover:ring-2 hover:ring-primary hover:shadow-lg'"
                @contextmenu.prevent="isDeleteMode = !isDeleteMode"
            >
                <!-- Image -->
                <div class="w-16 h-16 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 border-white shadow-md relative bg-gray-100">
                    <img 
                        :src="resolveImage(item)" 
                        draggable="false"
                        class="w-full h-full object-cover object-top pointer-events-none select-none" 
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
            id="dock-tool-toggle"
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
            id="dock-trash"
            ghost-class="hidden-ghost"
            @add="onTrashAdd"
        >
            <button 
                class="absolute inset-0 flex items-center justify-center text-gray-400 hover:text-pink-500 transition-all duration-200 w-full h-full border-2 border-dashed border-gray-300 rounded-xl hover:border-pink-500 hover:bg-pink-50"
                :class="{ 'border-pink-400 bg-pink-50 text-pink-500 scale-105 shadow-md': isDragging }"
                @click="clearDock"
                title="清空暂存区 / 拖入删除"
            >
                <div i-carbon-trash-can class="text-xl pointer-events-none" :class="{ 'animate-bounce': isDragging }" />
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
:global(.dock-drag-fallback .dock-delete-btn),
:global(.sortable-ghost .dock-delete-btn) {
    display: none !important;
}

/* Mobile Drag Fallback Visibility */
:global(.sortable-fallback),
:global(.dock-drag-fallback) {
    opacity: 1 !important;
    z-index: 99999 !important;
    pointer-events: none;
    width: auto !important;
    display: block !important;
    transition: none !important; /* Critical: Disable transition to prevent "rubber band" lag */
}
</style>
