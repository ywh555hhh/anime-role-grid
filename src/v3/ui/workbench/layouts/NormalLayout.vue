<script setup lang="ts">
import { useWorkbench } from '../../../platform/workbench/useWorkbench';

const { activeView, setMode } = useWorkbench();
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50 overflow-y-auto">
    <!-- 1. Hero / Info Section -->
    <section class="p-6 bg-white shadow-sm z-10">
      <h1 class="text-2xl font-bold text-gray-800">Normal Mode</h1>
      <p class="text-gray-500 mt-2 text-sm">
        手机用户友好模式。点击下方格子直接上传。
      </p>
      <div class="mt-4 flex gap-2">
         <button @click="setMode('STREAMER')" class="px-3 py-1 bg-purple-100 text-purple-600 rounded text-xs font-bold hover:bg-purple-200">
            Switch to Streamer Mode
         </button>
      </div>
    </section>

    <!-- 2. Main Canvas Area -->
    <div class="flex-1 min-h-[500px] p-4">
        <div class="h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
            <component v-if="activeView" :is="activeView.component" />
        </div>
    </div>

    <!-- 3. Bottom Toolbar -->
    <div class="p-4 bg-white border-t border-gray-100 flex gap-2 justify-center pb-8 safe-area-pb">
        <button class="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform">
            生成图片
        </button>
        <button class="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl active:scale-95 transition-transform">
            重置
        </button>
    </div>
  </div>
</template>

<style scoped>
.safe-area-pb {
    padding-bottom: env(safe-area-inset-bottom);
}
</style>
