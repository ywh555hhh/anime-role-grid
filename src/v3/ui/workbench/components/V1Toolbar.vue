<script setup lang="ts">
// V1 Toolbar Component
// Replicates src/components/GridActionButtons.vue

defineProps<{
  saving?: boolean
}>();

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'export-video'): void
  (e: 'create-new'): void
  (e: 'reset'): void
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

        <!-- Secondary Actions -->
        <div class="flex w-full gap-3">
             <button 
              class="flex-1 py-2 px-4 border border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2 active:scale-95"
              @click="emit('export-video')"
            >
              <div class="i-carbon-video-filled" />
              <span>导出视频</span>
            </button>
            <button 
              class="flex-1 py-2 px-4 border border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2 active:scale-95"
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
