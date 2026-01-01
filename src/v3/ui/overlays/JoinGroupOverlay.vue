<script setup lang="ts">
import CommunityGroupLinks from '../workbench/components/CommunityGroupLinks.vue';

const emit = defineEmits<{
  (e: 'close'): void
}>();
</script>

<template>
  <div class="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
    <!-- Header -->
    <div class="bg-gradient-to-r from-pink-50 to-white dark:from-pink-900/20 dark:to-gray-800 p-4 border-b border-pink-100 dark:border-pink-800/30 flex items-center justify-between shrink-0">
       <h3 class="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
          <div class="i-carbon-group text-primary" />
          <span>加入组织</span>
       </h3>
       <button 
         class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
         @click="emit('close')"
       >
         <div class="i-carbon-close text-lg" />
       </button>
    </div>

    <!-- Content -->
    <div class="p-4 overflow-y-auto flex-1 min-h-0 scrollbar-thin">
       <CommunityGroupLinks class="!border-0 !shadow-none !p-0 !bg-transparent" />
    </div>
    
    <div class="p-4 pt-0 text-center shrink-0">
        <p class="text-xs text-gray-400">请文明交流，遵守群规哦~</p>
    </div>
  </div>
</template>
