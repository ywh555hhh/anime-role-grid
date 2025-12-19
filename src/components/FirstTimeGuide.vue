<script setup lang="ts">



defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close'])

import { changelogs } from '~/logic/constants/changelog' // Extracted

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
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" 
      @click="emit('close')"
    >
      <!-- Outer Container -->
      <div 
        class="bg-white dark:bg-gray-900 w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl border-4 border-black dark:border-gray-700 relative flex flex-col overflow-hidden min-h-0" 
        @click.stop
      >
        <!-- Close Button -->
        <button 
          class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black text-white rounded-full hover:bg-primary transition-colors z-20"
          @click="emit('close')"
        >
          <div class="i-carbon-close text-xl" />
        </button>

        <!-- Scrollable Content -->
        <div class="overflow-y-auto flex-1 p-5 flex flex-col gap-4 scrollbar-hide">
          
          <!-- Compact Header -->
          <div class="text-center shrink-0 mt-2">
            <h1 class="text-2xl font-black text-[#000000] dark:text-white tracking-widest" style="font-family: 'Noto Serif SC', serif;">
              【我推<span class="text-primary">的</span>格子】
            </h1>
          </div>

          <!-- Content Sections -->
          <div class="space-y-4 text-sm text-gray-700 dark:text-gray-300 font-medium">

            <!-- Main Group Card (Exclusive for Guide) -->
            <a href="https://qun.qq.com/universal-share/share?ac=1&authKey=axd5YDW0i5ZiyX8jTultFRVHCHv9FAsCnqHq40itBLuQEoUOdCo06bAh05W%2Bv1c7&busi_data=eyJncm91cENvZGUiOiIxMDU1NTkxMDY0IiwidG9rZW4iOiJMazMxZ1pPZHdQejMyS1BaSFZ2UkJIdHp5b29NbTI4VU9NaGhSSW96T0NpcS9ha0oyZzJEVmpPRXZ1Nit2eTVNIiwidWluIjoiMTkxNjY0NzYxNiJ9&data=Tsay2nkLgPoS1UGFPbFnpdAsQeLPgFErKFco7mYPmWPldhqQme_u6smVnM0ifq8X5nO5TiLUbxgl57S9deOLIw&svctype=4&tempid=h5_group_info" 
               target="_blank" 
               class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-light/50 to-white dark:from-pink-900/20 dark:to-gray-800 border-2 border-pink-100 hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md p-4 flex items-center gap-4"
            >
                <div class="bg-white dark:bg-pink-900/30 p-3 rounded-full text-primary shadow-sm border border-pink-50 dark:border-pink-800/30 group-hover:scale-110 transition-transform duration-300">
                    <div class="i-carbon-chat text-2xl" />
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-0.5">
                     <span class="font-black text-base text-gray-900 dark:text-gray-100">加入综合交流大群</span>
                     <span class="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded text-xs font-bold">推荐</span>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">分享作品 / 寻找同好 / 反馈建议</div>
                </div>
                <div class="i-carbon-arrow-right text-xl text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </a>

            <!-- Action Buttons Row -->
            <div class="flex items-center gap-3 pt-2">
                <!-- GitHub Star -->
                <a 
                  href="https://github.com/ywh555hhh/anime-role-grid"
                  target="_blank"
                  class="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <div class="i-carbon-logo-github text-lg" />
                  <span>Star</span>
                </a>

                <!-- Start Making -->
                <button 
                  class="flex-[2] py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2"
                  @click="emit('close')"
                >
                  <div class="i-carbon-play-filled text-lg" />
                  <span>开始制作</span>
                </button>
            </div>

            <!-- Changelog (Moved to Bottom) -->
            <div class="space-y-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700 mt-2">
               <div class="text-[10px] text-center text-gray-400 font-medium mb-1 flex items-center justify-center gap-1 animate-pulse">
                   <div class="i-carbon-arrow-down" />
                   <span>查看最近更新</span>
                   <div class="i-carbon-arrow-down" />
               </div>

              <div 
                v-for="(log, idx) in changelogs" 
                :key="log.date"
                class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                  <button 
                    @click="log.isOpen = !log.isOpen"
                    class="w-full flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div class="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-xs">
                      <div :class="idx === 0 ? 'text-primary' : 'text-gray-400'" class="i-carbon-bullhorn" />
                      <span>{{ log.date }}</span>
                    </div>
                    <div 
                      class="i-carbon-chevron-down text-gray-400 transition-transform duration-200 text-xs"
                      :class="{ '-rotate-180': log.isOpen }"
                    />
                  </button>
                  
                  <div 
                      v-show="log.isOpen"
                      class="p-3 bg-white dark:bg-gray-900/50 text-[10px] space-y-2 border-t border-gray-100 dark:border-gray-800"
                  >
                      <div v-for="(item, i) in log.items" :key="i" class="flex gap-1.5 items-start leading-relaxed">
                          <span 
                            class="font-bold shrink-0"
                            :class="{
                              'text-primary': item.type === 'new',
                              'text-pink-600': item.type === 'up',
                              'text-pink-400': item.type === 'opt'
                            }"
                          >[{{ item.tag }}]</span>
                          <span v-html="item.content"></span>
                      </div>
                  </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes bounce-low {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.animate-bounce-low {
  animation: bounce-low 2s ease-in-out infinite;
}

/* Hide scrollbar */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.group-btn {
  @apply relative overflow-hidden rounded-xl p-2
  bg-white dark:bg-gray-800 
  border-2 border-transparent hover:border-primary
  text-gray-900 dark:text-white
  shadow-sm hover:shadow-md
  transition-all duration-200 ease-out flex flex-col items-center justify-center min-h-[3rem] h-auto;
}

.group-btn:hover {
  @apply transform scale-[1.01];
}

.group-btn:active {
  @apply transform scale-[0.98];
}
</style>
