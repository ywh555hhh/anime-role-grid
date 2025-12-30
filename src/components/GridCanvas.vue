<script setup lang="ts">
import Grid from '~/components/Grid.vue'
import type { GridItem } from '~/types'

defineProps<{
  list: GridItem[]
  cols: number
  title?: string
  customTitle?: string
  defaultTitle?: string
  showCharacterName: boolean
  modeIsCustom?: boolean
  fillerName?: string
  isStreamerMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:customTitle', value: string): void
  (e: 'update:showCharacterName', value: boolean): void
  (e: 'update:fillerName', value: string): void
  (e: 'select-slot', index: number): void
  (e: 'update-label', payload: { index: number, label: string }): void
  (e: 'return-home'): void
  (e: 'drop-item', payload: any): void
}>()

</script>

<template>
  <div class="relative w-full flex flex-col items-center gap-2">
    <!-- Tip -->
    <!-- Tip -->
    <div v-if="!isStreamerMode" class="flex items-center gap-2 text-primary bg-primary-light/80 px-4 py-1.5 rounded-full border border-primary-light shadow-sm animate-hint-cycle">
         <div class="i-carbon-edit text-sm" />
         <span class="text-xs font-bold">小贴士：表格上方标题、格子下方标签文字，都是可以自定义修改的哦！</span>
    </div>

     <!-- Navigation for Custom Mode -->
     <div v-if="modeIsCustom" class="w-full flex justify-center mb-2">
         <button 
            @click="emit('return-home')" 
            class="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors py-1 px-4 rounded-full border border-transparent hover:border-primary-light hover:bg-primary-light"
         >
            <div i-carbon-home class="text-lg" />
            <span class="font-bold text-sm">返回官方模版</span>
         </button>
     </div>

    <Grid 
        id="grid-capture-target"
        :list="list" 
        :cols="cols"
        :title="title" 
        :customTitle="customTitle"
        :defaultTitle="defaultTitle"
        @update:customTitle="emit('update:customTitle', $event)"
        @select-slot="emit('select-slot', $event)"
        @update-label="emit('update-label', $event)"
        @drop-item="emit('drop-item', $event)"
        :show-character-name="showCharacterName"
        :is-streamer-mode="isStreamerMode"
    />
    
     <div class="flex flex-wrap items-center justify-center gap-4 mt-4 w-full px-4">
        <!-- Toggle: Character Names -->


         <!-- Input: Filler Name (Only for Custom Mode) -->
         <div v-if="modeIsCustom" class="flex items-center gap-2 px-4 py-2 bg-white rounded-full border-2 border-gray-200 focus-within:border-primary transition-all">
             <div class="i-carbon-user text-gray-400" />
             <input 
               :value="fillerName"
               @input="emit('update:fillerName', ($event.target as HTMLInputElement).value)"
               placeholder="您的昵称 (可选)" 
               class="bg-transparent outline-none text-sm font-bold text-gray-700 w-32 placeholder-gray-400"
             />
         </div>
     </div>
  </div>
</template>

<style scoped>
.animate-hint-cycle {
  animation: hint-cycle 8s ease-in-out infinite;
}
@keyframes hint-cycle {
  0% { opacity: 0; transform: translateY(5px); }
  5% { opacity: 1; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(0); }
  45% { opacity: 0; transform: translateY(-5px); }
  100% { opacity: 0; transform: translateY(-5px); }
}
</style>
