<script setup lang="ts">
defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close'])

const GROUP_LINK = 'https://qm.qq.com/q/Jkf6Vgmyw8'
const BILIBILI_LINK = 'https://space.bilibili.com/36078469'
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
      <div
        class="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
        @click.stop
      >
        <!-- Header -->
        <div class="bg-gradient-to-r from-pink-50 to-white dark:from-pink-900/20 dark:to-gray-800 p-4 border-b border-pink-100 dark:border-pink-800/30 flex items-center justify-between shrink-0">
           <h3 class="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
              <div class="i-carbon-fire text-primary" />
              <span>大家都在填</span>
           </h3>
           <button
             class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
             @click="emit('close')"
           >
             <div class="i-carbon-close text-lg" />
           </button>
        </div>

        <!-- Content -->
        <div class="p-4 overflow-y-auto flex-1 min-h-0 scrollbar-thin">
           <!-- Hot Templates -->
           <div class="mb-4">
             <div class="text-xs font-bold text-gray-400 mb-2">热门模板</div>
             <div class="grid grid-cols-3 gap-2">
               <button
                 @click="emit('close')"
                 class="p-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-primary bg-white dark:bg-gray-800 text-center transition-all hover:shadow-md flex flex-col items-center gap-1"
               >
                 <div class="i-carbon-user-avatar text-2xl text-primary" />
                 <div class="text-[10px] font-bold text-gray-700 dark:text-gray-200 leading-tight">我的动漫人物<br>喜好果然有问题</div>
               </button>
               <button
                 @click="emit('close')"
                 class="p-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-primary bg-white dark:bg-gray-800 text-center transition-all hover:shadow-md flex flex-col items-center gap-1"
               >
                 <div class="i-carbon-book text-2xl text-primary" />
                 <div class="text-[10px] font-bold text-gray-700 dark:text-gray-200 leading-tight">构成我人生的<br>9 部漫画</div>
               </button>
               <button
                 @click="emit('close')"
                 class="p-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-primary bg-white dark:bg-gray-800 text-center transition-all hover:shadow-md flex flex-col items-center gap-1"
               >
                 <div class="i-carbon-list text-2xl text-primary" />
                 <div class="text-[10px] font-bold text-gray-700 dark:text-gray-200 leading-tight">Bro 懂我的<br>XP</div>
               </button>
             </div>
           </div>

           <!-- Join Group CTA -->
           <a
             :href="GROUP_LINK"
             target="_blank"
             class="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-light/50 to-white dark:from-pink-900/20 dark:to-gray-800 border-2 border-pink-100 hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md p-4 flex items-center gap-4 mb-3"
           >
               <div class="bg-white dark:bg-pink-900/30 p-3 rounded-full text-primary shadow-sm border border-pink-50 dark:border-pink-800/30 group-hover:scale-110 transition-transform duration-300">
                   <div class="i-carbon-chat text-2xl" />
               </div>
               <div class="flex-1">
                 <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-black text-base text-gray-900 dark:text-gray-100">加入【我推的ACNG】</span>
                    <span class="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded text-xs font-bold">推荐</span>
                 </div>
                 <div class="text-xs text-gray-500 dark:text-gray-400">分享作品 / 寻找同好 / 反馈建议</div>
               </div>
               <div class="i-carbon-arrow-right text-xl text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
           </a>

           <!-- Bilibili -->
           <a
             :href="BILIBILI_LINK"
             target="_blank"
             class="w-full group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md p-4 flex items-center gap-4"
           >
               <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded-full text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform duration-300">
                   <svg class="w-6 h-6" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M777.514667 131.669333a53.333333 53.333333 0 0 0-48.426667 26.965334l-50.816 87.168a483.2 483.2 0 0 0-166.4-29.226667c-58.453333 0-114.346667 10.197333-167.082667 29.354667l-50.176-87.296a53.333333 53.333333 0 0 0-93.610666 52.138666L246.229333 289.834667c-112.554667 64.938667-189.696 182.997333-197.888 320.128-0.554667 9.173333-0.853333 18.261333-0.853333 27.264 0 6.058667 0.170667 12.16 0.469333 18.218666 6.058667 134.4 81.365333 249.514667 189.610667 312.362667a476.330667 476.330667 0 0 0 549.973333 0.256c108.416-62.805333 183.936-177.877333 190.122667-312.576 0.298667-6.058667 0.426-12.202667 0.426-18.261333 0-8.96-0.341333-17.962667-0.938667-27.050667-8.192-137.216-85.333333-255.488-197.930666-320.384l45.226666-78.122666a53.333333 53.333333 0 0 0-46.933333-80.042667zM337.024 624.128c-30.848 0-55.850667-27.605333-55.850667-61.696s25.002667-61.696 55.850667-61.696c30.848 0 55.850667 27.605333 55.850666 61.696s-25.002667 61.696-55.850666 61.696z m352.085333 0c-30.848 0-55.850667-27.605333-55.850666-61.696s25.002667-61.696 55.850666-61.696c30.848 0 55.850667 27.605333 55.850667 61.696s-25.002667 61.696-55.850667 61.696z" /></svg>
               </div>
               <div class="flex-1">
                 <div class="font-bold text-sm text-gray-900 dark:text-gray-100">关注 @我推的祥子丶</div>
                 <div class="text-xs text-gray-500 dark:text-gray-400">获取更多二次元模板</div>
               </div>
               <div class="i-carbon-arrow-right text-xl text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
           </a>
        </div>

        <!-- Footer -->
        <div class="p-4 pt-0 text-center shrink-0">
            <button
              @click="emit('close')"
              class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              直接开始制作 →
            </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
