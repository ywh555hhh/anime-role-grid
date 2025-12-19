<script setup lang="ts">


defineProps<{
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'export-video'): void
  (e: 'create-new'): void
}>()
</script>

<template>
    <div class="flex flex-col items-center gap-4 w-full max-w-md mt-2">
       <button 
          class="w-full btn-primary text-lg"
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
              class="flex-1 btn-outline-primary"
              @click="emit('export-video')"
            >
              <div i-carbon-video-filled />
              <span>导出视频</span>
            </button>
            
             <button 
              class="flex-1 btn-outline-primary relative group overflow-hidden"
              @click="emit('create-new')"
            >
               <div class="absolute inset-0 bg-primary-light/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
               <div i-carbon-add-alt />
               <span>我要出题</span>
             </button>
        </div>
        
        <!-- Extra Slots (e.g. Reset Tags, Open Gallery) -->
        <slot name="extra-actions"></slot>
   </div>
</template>
