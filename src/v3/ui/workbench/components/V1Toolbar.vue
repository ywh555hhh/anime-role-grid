<script setup lang="ts">
// V1 Toolbar Component
// Replicates src/components/GridActionButtons.vue

import type { IToolbarContribution } from '../../../platform/api/IPlugin';

defineProps<{
  saving?: boolean;
  actions?: IToolbarContribution[];
}>();

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'export-dom'): void
  (e: 'create-new'): void
  (e: 'reset'): void
  (e: 'action', commandId: string): void
}>();
</script>

<template>
    <div class="flex flex-col items-center gap-4 w-full max-w-md mx-auto p-4">
        <!-- Main Save Button -->
       <button 
          class="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="saving"
          @click="emit('save')"
        >
          <div v-if="saving" class="i-carbon-circle-dash animate-spin text-xl" />
          <div v-else class="i-carbon-image text-xl" />
          <span>{{ saving ? '生成中...' : '保存高清图片' }}</span>
        </button>

        <!-- Dynamic Grid Controls (Plugin Contributions) -->
        <div v-if="actions && actions.length > 0" class="flex flex-wrap w-full gap-2">
            <button 
                v-for="action in actions"
                :key="action.id"
                class="flex-1 min-w-[30%] py-2 px-2 border border-gray-200 bg-gray-50 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-1 active:scale-95 text-xs md:text-sm whitespace-nowrap"
                @click="emit('action', action.command)"
            >
                <div :class="[action.icon, 'text-base md:text-lg']" />
                <span>{{ action.label }}</span>
            </button>
        </div>

        <!-- Secondary Actions -->
        <div class="flex w-full gap-3">
             <button 
              class="flex-1 py-2 px-4 border border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2 active:scale-95 text-sm md:text-base whitespace-nowrap"
              @click="emit('export-dom')"
            >
              <div class="i-carbon-camera" />
              <span>所见即所得</span>
            </button>
            <button 
              class="flex-1 py-2 px-4 border border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2 active:scale-95 text-sm md:text-base whitespace-nowrap"
              @click="emit('create-new')"
            >
              <div class="i-carbon-add-alt" />
              <span>我要出题</span>
            </button>
        </div>
        
        <!-- Reset Link -->
        <button 
            @click="emit('reset')"
            class="text-gray-400 text-sm underline hover:text-gray-600 mt-2"
        >
            重置当前画布
        </button>
   </div>
</template>
