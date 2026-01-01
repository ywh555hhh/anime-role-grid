<script setup lang="ts">
import { ref, onMounted } from 'vue';

// --- Announcement Logic ---
const showAnnouncement = ref(false);
const STORAGE_KEY = 'global_announcement_v1_closed_new'; // Use new key to reset user choice if needed

onMounted(() => {
  const isClosed = localStorage.getItem(STORAGE_KEY);
  if (!isClosed) {
    showAnnouncement.value = true;
  }
});

function closeAnnouncement() {
  showAnnouncement.value = false;
  localStorage.setItem(STORAGE_KEY, 'true');
}

function goHome() {
    window.location.href = '/';
}
</script>

<template>
  <div class="flex flex-col w-full z-10">
      <!-- 1. Announcement Banner -->
      <transition enter-active-class="animate-in slide-in-from-top fade-in" leave-active-class="animate-out slide-out-to-top fade-out" >
          <div v-if="showAnnouncement" class="bg-white text-primary shadow-sm border-b border-pink-100 w-full relative z-20">
            <div class="container mx-auto px-4 py-3 flex items-start gap-4">
              <div class="i-carbon-warning-filled text-xl mt-0.5 shrink-0" />
              <div class="flex-1 text-sm md:text-base leading-relaxed">
                <p class="font-bold mb-1">⚠️ 旧版测试模版停止服务公告</p>
                <p class="opacity-90 text-gray-600">
                    因“V3.0 正式版”架构升级，<strong>所有测试阶段创建的旧模版</strong>均因格式不兼容已弃用。
                    如页面提示 <span class="font-mono bg-gray-100 px-1 rounded text-red-500">Template not found</span>，
                    请 <button @click="goHome" class="underline hover:text-primary font-bold text-gray-800">返回首页</button> 重新创建。
                </p>
              </div>
              <button 
                @click="closeAnnouncement"
                class="shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-primary"
                title="不再显示"
              >
                <div class="i-carbon-close text-xl" />
              </button>
            </div>
          </div>
      </transition>

      <!-- 2. Main Header (V1 Style) -->
      <header class="bg-white shadow-sm p-6 shrink-0 relative z-10">
          <div class="flex flex-col items-center justify-center gap-4">
            <!-- Logo + Title -->
            <div class="flex flex-col items-center gap-3 md:flex-row md:gap-4 md:items-end">
                <img src="/logo.png" alt="Logo" class="w-16 h-16 object-contain drop-shadow-sm" />
                
                <h1 
                  class="font-bold text-gray-900 tracking-widest text-3xl md:text-5xl"
                  style="font-family: 'Noto Serif SC', serif;"
                >
                  【我推<span class="text-primary">的</span>格子】
                </h1>
            </div>

            <!-- Separator Line -->
            <div class="bg-primary rounded-full w-full max-w-sm h-[4px] mt-2 opacity-80" />
            
            <p class="text-gray-500 text-sm mt-1">
                手机用户友好模式。点击下方格子直接上传。
            </p>
          </div>
      </header>
  </div>
</template>
