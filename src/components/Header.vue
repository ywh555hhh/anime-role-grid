<script setup lang="ts">
import { useGridStore } from '~/stores/gridStore'

const { isStreamerMode } = useGridStore()
</script>

<template>
  <header 
    class="flex flex-col items-center justify-center transition-all duration-500 ease-in-out z-50"
    :class="[
      isStreamerMode 
        ? 'fixed top-4 left-4 w-auto h-auto mb-0 px-0 pt-0 hover:scale-105 cursor-pointer origin-top-left opacity-60 hover:opacity-100' // Streamer Mode: Transparent, Subtle
        : 'w-full gap-4 mb-4 md:mb-8 px-4 pt-8 static' // Normal Mode
    ]"
    @click="isStreamerMode && (isStreamerMode = false)"
    :title="isStreamerMode ? '点击退出专注模式' : ''"
  >
    <!-- Brand Logo & Title Wrapper -->
    <div 
        class="flex items-center transition-all duration-500"
        :class="isStreamerMode ? 'gap-0 flex-row' : 'flex-col gap-6 w-full'"
    >
      <!-- Logo + Title -->
      <div 
        class="flex items-center transition-all duration-500"
        :class="isStreamerMode ? 'gap-2' : 'flex-col md:flex-row gap-3 md:gap-4'"
      >
        <img 
            src="/logo.png" 
            alt="Logo" 
            class="object-contain drop-shadow-sm transition-all duration-500"
            :class="isStreamerMode ? 'w-8 h-8 md:w-8 md:h-8' : 'w-16 h-16 md:w-20 md:h-20'" 
        />
        
        <h1 
          class="font-bold text-gray-900 tracking-widest transition-all duration-500 whitespace-nowrap overflow-hidden"
          :class="isStreamerMode ? 'max-w-0 opacity-0 md:max-w-xs md:opacity-100 text-sm' : 'text-3xl md:text-5xl opacity-100'"
          style="font-family: 'Noto Serif SC', serif;"
        >
          【我推<span class="text-primary">的</span>格子】
        </h1>
      </div>
      
      <!-- Decorative Separator (Matches width of content above) -->
      <div 
        class="bg-primary rounded-full transition-all duration-500" 
        :class="isStreamerMode ? 'hidden' : 'w-full max-w-sm h-[4px] mt-2'"
      />
    </div>
  </header>
</template>
