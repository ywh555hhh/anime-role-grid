<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close'])

const showChangelog = ref(true) // Default open for visibility
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
        class="bg-white dark:bg-gray-900 w-full max-w-md max-h-[85vh] rounded-2xl shadow-2xl border-4 border-black dark:border-gray-700 relative flex flex-col overflow-hidden" 
        @click.stop
      >
        <!-- Close Button -->
        <button 
          class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black text-white rounded-full hover:bg-[#e4007f] transition-colors z-20"
          @click="emit('close')"
        >
          <div class="i-carbon-close text-xl" />
        </button>

        <!-- Scrollable Content -->
        <div class="overflow-y-auto flex-1 p-6 flex flex-col gap-6 scrollbar-hide">
          
          <!-- Welcome Image -->
          <div class="w-full flex items-center justify-center shrink-0 pt-2">
             <img 
               src="/cana4.webp" 
               class="h-20 object-contain"
               alt="Welcome"
             />
          </div>

          <!-- Title -->
          <div class="text-center shrink-0">
            <h2 class="text-xl font-bold text-[#000000] dark:text-white mb-1">
              欢迎来到
            </h2>
            <h1 class="text-3xl font-black mb-2 text-[#000000] dark:text-white tracking-widest" style="font-family: 'Noto Serif SC', serif;">
              【我推<span class="text-[#e4007f]">的</span>格子】
            </h1>
          </div>

          <!-- Content Sections -->
          <div class="space-y-5 text-sm text-gray-700 dark:text-gray-300 font-medium">

            <!-- Changelog (Collapsible) -->
            <div class="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button 
                  @click="showChangelog = !showChangelog"
                  class="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div class="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                    <div class="i-carbon-bullhorn text-[#e4007f]" />
                    <span>更新日志 (2025.12.06)</span>
                  </div>
                  <div 
                    class="i-carbon-chevron-down text-gray-400 transition-transform duration-200"
                    :class="{ '-rotate-180': showChangelog }"
                  />
                </button>
                
                <div 
                    v-show="showChangelog"
                    class="p-4 bg-white dark:bg-gray-900/50 text-xs space-y-3 border-t border-gray-100 dark:border-gray-800"
                >
                    <div class="flex gap-2">
                        <span class="font-bold text-[#e4007f] shrink-0">[NEW]</span>
                        <span><b>视频导出功能 (Beta)</b> 上线！支持生成酷炫的动态视频。</span>
                    </div>
                    <div class="flex gap-2">
                        <span class="font-bold text-[#e4007f] shrink-0">[NEW]</span>
                        <span>支持<b>自定义上传图片命名</b>，修复长名字显示问题。</span>
                    </div>
                    <div class="flex gap-2">
                        <span class="font-bold text-[#e4007f] shrink-0">[OPT]</span>
                        <span>优化水印样式与间距，整体视觉更协调。</span>
                    </div>
                </div>
            </div>

            <!-- Community Groups -->
            <div class="bg-pink-50/50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-800/30 p-4 rounded-2xl">
              <div class="flex gap-2 items-center mb-2 text-[#e4007f] font-bold">
                <div class="i-carbon-group text-lg" />
                <h3>加入组织</h3>
              </div>
              
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                这是<b>刚刚创立</b>的 QQ 组织，主打 <b>分享格子</b> 与 <b>寻找同好</b>。<br>
                群内氛围和谐，点击下方按钮<b>一键加入</b>！
              </p>

              <div class="grid grid-cols-2 gap-3">
                
                <!-- Main Group: Comprehensive -->
                <a href="https://qun.qq.com/universal-share/share?ac=1&authKey=axd5YDW0i5ZiyX8jTultFRVHCHv9FAsCnqHq40itBLuQEoUOdCo06bAh05W%2Bv1c7&busi_data=eyJncm91cENvZGUiOiIxMDU1NTkxMDY0IiwidG9rZW4iOiJMazMxZ1pPZHdQejMyS1BaSFZ2UkJIdHp5b29NbTI4VU9NaGhSSW96T0NpcS9ha0oyZzJEVmpPRXZ1Nit2eTVNIiwidWluIjoiMTkxNjY0NzYxNiJ9&data=Tsay2nkLgPoS1UGFPbFnpdAsQeLPgFErKFco7mYPmWPldhqQme_u6smVnM0ifq8X5nO5TiLUbxgl57S9deOLIw&svctype=4&tempid=h5_group_info" target="_blank" class="group-btn group col-span-2 bg-gradient-to-r from-pink-50 to-white dark:from-gray-800 dark:to-gray-900">
                    <div class="flex flex-col items-center justify-center w-full pt-1">
                      <div class="text-lg font-black tracking-wide leading-none mb-2">综合交流主群</div>
                      <div class="text-xs text-gray-500 font-medium text-center px-4 leading-relaxed line-clamp-2">
                        官方综合大群，发布最新公告，反馈 Bug，与开发者直接交流，也是最热闹的闲聊中心。
                      </div>
                    </div>
                    <div class="w-full py-2 bg-[#e4007f] text-white text-center rounded-lg text-sm font-bold shadow-sm group-hover:shadow-pink-500/30 transition-shadow mt-3">
                        点击加入主群
                    </div>
                </a>

                <!-- Q Group: ACN -->
                <a href="https://qun.qq.com/universal-share/share?ac=1&authKey=1LsjjxDEHjGWTDq3%2FRSfv4Qcb3ESkVgBC3mQmdOPhuFBeEfIbQnuHFGI%2BEA4QLIE&busi_data=eyJncm91cENvZGUiOiIxMDE4MjEzNjUzIiwidG9rZW4iOiJ1aUhXOHFjdlQwSGJlZjNCN0NWS0laRzI3MEY1MHhvczZiRW9EOU1xSGRxaTRJS21aSkRXWFhKTmMrWS9mM2JCIiwidWluIjoiMTkxNjY0NzYxNiJ9&data=ODTRpLsOGRek2N-cVzqTSr2rKDj1y3nmdtdgRnP_iZE7WKUGq9fr2LJHiSf9LLX4YNX78Rpq_mpvT8ROyfoC8g&svctype=4&tempid=h5_group_info" target="_blank" class="group-btn group">
                    <div class="flex flex-col items-center w-full">
                      <div class="text-base font-black tracking-wide leading-none mb-2">ACN 交流</div>
                      <div class="text-[10px] text-gray-400 font-medium text-center px-1 leading-normal h-8 flex items-center">
                        专注动画、漫画、轻小说的分享交流，一起追番吧！
                      </div>
                    </div>
                    <div class="w-full py-1.5 bg-[#e4007f] text-white text-center rounded-lg text-xs font-bold shadow-sm group-hover:shadow-pink-500/30 transition-shadow mt-auto">
                        点击加入
                    </div>
                </a>

                <!-- W Group: Mobile/Anime Games -->
                <a href="https://qun.qq.com/universal-share/share?ac=1&authKey=N%2Bfruq0iPx8IhUvbksaoNR2vPtCr7tTmrRRPfmGvuYlExWoy2LZsGfaL183PzNXO&busi_data=eyJncm91cENvZGUiOiI4NTkzNjEwOTkiLCJ0b2tlbiI6Ii9DQy9KZ0l4bzNObWFrOXJwbEV0Q3cxRmVNNmtOOGpDZFNLOCt1bHNxb05WL29zQVo1UlE4czVTWDM4dU8vZUsiLCJ1aW4iOiIxOTE2NjQ3NjE2In0%3D&data=caBB9HR43RsqoEKBASBC1plB48DZi3RsJLnQ7dgEYPj8fmVGnVqGWLn7YbYe_oZcAHod8KqRzsdl5hXVUQ9OaQ&svctype=4&tempid=h5_group_info" target="_blank" class="group-btn group">
                    <div class="flex flex-col items-center w-full">
                      <div class="text-base font-black tracking-wide leading-none mb-2">二游</div>
                      <div class="text-[10px] text-gray-400 font-medium text-center px-1 leading-normal h-8 flex items-center">
                        手游玩家聚集地，讨论抽卡运气、剧情攻略与最新资讯。
                      </div>
                    </div>
                    <div class="w-full py-1.5 bg-[#e4007f] text-white text-center rounded-lg text-xs font-bold shadow-sm group-hover:shadow-pink-500/30 transition-shadow mt-auto">
                        点击加入
                    </div>
                </a>

                <!-- E Group: Galgame -->
                <a href="https://qun.qq.com/universal-share/share?ac=1&authKey=KgGU8v2up7Umiwm97tlf6w9sQtNEHYrre4N%2BMKTxBsGS8b0mjwfgCm32QT3wafRj&busi_data=eyJncm91cENvZGUiOiIxNzYxODYwMTkiLCJ0b2tlbiI6InFTd2dSWmNyWXgvaHJvaHl3akd2bCtpdFRyOUd1QVdsM2t6MXNuczdpRjkyUHdyYzY4bngwbnVWV1MwYkI3WjYiLCJ1aW4iOiIzNjYzNTU4MDg3In0%3D&data=q2YUZm5dBCs7tzjCofgNzBxV77kTJNI5nHbeQ8b7zp8M3AeiUa2dqAyois_Pg4RFdwC-SJF4XpuYpAy9twSURg&svctype=4&tempid=h5_group_info" target="_blank" class="group-btn group">
                    <div class="flex flex-col items-center w-full">
                      <div class="text-base font-black tracking-wide leading-none mb-2">Galgame</div>
                      <div class="text-[10px] text-gray-400 font-medium text-center px-1 leading-normal h-8 flex items-center">
                        美少女游戏专门讨论区，推神作、聊剧情、分享汉化资源。
                      </div>
                    </div>
                    <div class="w-full py-1.5 bg-[#e4007f] text-white text-center rounded-lg text-xs font-bold shadow-sm group-hover:shadow-pink-500/30 transition-shadow mt-auto">
                        点击加入
                    </div>
                </a>

                <!-- R Group: Water -->
                <a href="https://qm.qq.com/q/kHNDRQUhj4" target="_blank" class="group-btn group">
                    <div class="flex flex-col items-center w-full">
                      <div class="text-base font-black tracking-wide leading-none mb-2">神人大水群</div>
                      <div class="text-[10px] text-gray-400 font-medium text-center px-1 leading-normal h-8 flex items-center">
                        闲聊吹水、分享日常、发癫卖萌，什么都可以聊的综合群。
                      </div>
                    </div>
                    <div class="w-full py-1.5 bg-[#e4007f] text-white text-center rounded-lg text-xs font-bold shadow-sm group-hover:shadow-pink-500/30 transition-shadow mt-auto">
                        点击加入
                    </div>
                </a>
              </div>
            </div>

            <!-- Star Project -->
            <a 
              href="https://github.com/ywh555hhh/anime-role-grid"
              target="_blank"
              class="w-full py-2.5 bg-[#24292e] dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
            >
              <div class="i-carbon-logo-github text-lg" />
              <div class="flex flex-col items-start leading-none">
                <span class="font-bold text-xs">GitHub Star</span>
                <span class="text-[10px] opacity-80 font-normal">支持开源项目</span>
              </div>
            </a>
            
          </div>

          <!-- Footer Action -->
          <div class="pt-2">
            <p class="text-[10px] text-gray-400 text-center mb-2 px-2">
               我们将匿名收集生成的成分表（仅角色数据，不含个人信息），<br>用于制作全网趣味统计榜单，感谢支持~ ❤️
            </p>
            <button 
              class="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
              @click="emit('close')"
            >
              开始制作
            </button>
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
  @apply relative overflow-hidden rounded-xl p-3
  bg-white dark:bg-gray-800 
  border-2 border-transparent hover:border-[#e4007f]
  text-gray-900 dark:text-white
  shadow-sm hover:shadow-md
  transition-all duration-200 ease-out flex flex-col justify-between min-h-[7rem] h-auto;
}

.group-btn:hover {
  @apply transform scale-[1.01];
}

.group-btn:active {
  @apply transform scale-[0.98];
}
</style>
