<script setup lang="ts">
import { useWorkbench } from '../../platform/workbench/useWorkbench';

const { views, docks, activePanelId, activeViewId, togglePanel, switchView } = useWorkbench();
</script>

<template>
  <nav 
    class="bg-white flex shrink-0 z-20 shadow-[1px_0_20px_rgba(0,0,0,0.02)] fixed bottom-0 left-0 right-0 h-16 items-center justify-around border-t border-gray-100 md:static md:border-t-0 md:flex-col md:w-20 md:h-full md:border-r md:border-transparent md:pt-4 md:pb-4 gap-2"
    style="padding-bottom: env(safe-area-inset-bottom);"
  >
    <!-- 1. VIEWS (Main Content Switcher) -->
    <div 
      v-for="[id, view] in views" 
      :key="id"
      class="cursor-pointer flex flex-col items-center justify-center relative md:w-12 md:h-12"
      @click="switchView(id)"
      :title="'View: ' + view.name"
    >
       <div 
         class="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200"
         :class="activeViewId === id ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-400 hover:bg-gray-100'"
       >
          <!-- Simple Icon Placeholder (First char of name) -->
          <span class="font-bold text-base">{{ view.name[0] }}</span>
       </div>
       <!-- Dot Indicator -->
       <div v-if="activeViewId === id" class="absolute -right-1 top-2 w-2 h-2 bg-pink-400 rounded-full border-2 border-white md:block hidden" />
    </div>

    <!-- Separator -->
    <div class="hidden md:block w-8 h-px bg-gray-200 my-2" />

    <!-- 2. DOCKS (Side Panel Toggles) -->
    <div 
      v-for="[id, dock] in docks" 
      :key="id"
      class="cursor-pointer flex flex-col items-center justify-center relative md:w-12 md:h-12"
      @click="togglePanel(id)"
      :title="'Dock: ' + dock.title"
    >
      <div 
        class="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200"
        :class="activePanelId === id ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'"
      >
          <span class="font-medium text-base">{{ dock.title[0] }}</span>
      </div>
    </div>
  </nav>
</template>
