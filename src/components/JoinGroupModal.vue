<script setup lang="ts">
import CommunityGroupLinks from './CommunityGroupLinks.vue'

defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close'])
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div 
      v-if="show" 
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" 
      @click="emit('close')"
    >
      <div 
        class="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]" 
        @click.stop
      >
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

        <div class="p-4 overflow-y-auto flex-1 min-h-0 scrollbar-thin">
           <CommunityGroupLinks class="!border-0 !shadow-none !p-0 !bg-transparent" />
        </div>
        
        <div class="p-4 pt-0 text-center shrink-0">
            <p class="text-xs text-gray-400">请文明交流，遵守群规哦~</p>
        </div>
      </div>
    </div>
  </Transition>
</template>
