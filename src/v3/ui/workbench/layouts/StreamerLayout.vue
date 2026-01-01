<script setup lang="ts">
import { useWorkbench } from '../../../platform/workbench/useWorkbench';
import SidePanel from '../SidePanel.vue';

const { activeView, isPanelOpen, togglePanel, setMode } = useWorkbench();
</script>

<template>
  <div class="flex h-full w-full bg-gray-900 overflow-hidden relative">
    
    <!-- 1. Floating Dock (Left) -->
    <!-- In Streamer mode, docks are initially hidden or collapsable -->
    <div v-if="isPanelOpen" class="w-64 h-full bg-gray-800 border-r border-gray-700 z-20 shadow-2xl">
        <SidePanel />
    </div>

    <!-- 2. Main Canvas (Fullscreen-ish) -->
    <div class="flex-1 h-full relative flex flex-col">
        <!-- Minimal Header -->
        <header class="h-12 bg-gray-800/50 flex items-center px-4 justify-between border-b border-white/5">
             <div class="text-white/50 text-xs font-mono">STREAMER MODE</div>
             <div class="flex gap-2">
                 <button @click="togglePanel('builtin.docks.assets')" class="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600">
                    {{ isPanelOpen ? 'Hide Pool' : 'Show Pool' }}
                 </button>
                 <button @click="setMode('NORMAL')" class="px-3 py-1 bg-blue-900/50 text-blue-300 rounded text-xs hover:bg-blue-900">
                    Exit
                 </button>
             </div>
        </header>

        <!-- Viewport -->
        <main class="flex-1 overflow-hidden relative bg-gray-900">
             <component v-if="activeView" :is="activeView.component" />
        </main>
    </div>
  </div>
</template>
