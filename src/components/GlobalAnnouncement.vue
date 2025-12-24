<script setup lang="ts">
import { ref, onMounted } from 'vue'

const show = ref(false)
const STORAGE_KEY = 'global_announcement_v1_closed'

onMounted(() => {
  const isClosed = localStorage.getItem(STORAGE_KEY)
  if (!isClosed) {
    show.value = true
  }
})

function close() {
  show.value = false
  localStorage.setItem(STORAGE_KEY, 'true')
}

function goHome() {
    window.location.href = '/'
}
</script>

<template>
  <div v-if="show" class="bg-white text-primary shadow-sm fixed top-0 left-0 right-0 z-[100] border-b border-pink-100">
    <div class="container mx-auto px-4 py-3 flex items-start gap-4">
      <div class="i-carbon-warning-filled text-xl mt-0.5 shrink-0" />
      <div class="flex-1 text-sm md:text-base leading-relaxed">
        <p class="font-bold mb-1">⚠️ 旧版测试模版停止服务公告</p>
        <p class="opacity-90 text-gray-600">
            此前发布的制表功能仅为<strong>测试版</strong>，因“V3.0 正式版”架构升级，<strong>所有测试阶段创建的旧模版</strong>均因格式不兼容已弃用。
            如页面提示 <span class="font-mono bg-gray-100 px-1 rounded text-red-500">Template not found</span>，
            请 <button @click="goHome" class="underline hover:text-primary font-bold text-gray-800">返回首页</button> 重新创建。
        </p>
        <p class="text-xs mt-1 text-gray-400">此次升级重构了底层数据结构，旧版数据无法保留，十分抱歉！(Test phase templates deprecated)</p>
      </div>
      <button 
        @click="close"
        class="shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-primary"
        title="不再显示"
      >
        <div class="i-carbon-close text-xl" />
      </button>
    </div>
  </div>
</template>
