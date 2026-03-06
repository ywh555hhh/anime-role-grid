<script setup lang="ts">
defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close'])

const GROUP_LINK = 'https://qm.qq.com/q/Jkf6Vgmyw8'
const BILIBILI_LINK = 'https://space.bilibili.com/36078469'

function joinGroup() {
    window.open(GROUP_LINK, '_blank')
    emit('close')
}

function goToBilibili() {
    window.open(BILIBILI_LINK, '_blank')
}

function skip() {
    emit('close')
}
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
        class="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border-4 border-primary relative flex flex-col overflow-hidden"
        @click.stop
      >
        <!-- Close Button -->
        <button
          class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors z-20"
          @click="skip"
        >
          <div class="i-carbon-close text-xl" />
        </button>

        <!-- Content -->
        <div class="p-6 flex flex-col items-center text-center">
          <!-- Header -->
          <div class="text-5xl mb-4">🎉</div>
          <h2 class="text-xl font-black text-gray-900 dark:text-white mb-2">
            欢迎来到【我推的格子】！
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            二次元阿宅的精神角落
          </p>

          <!-- Hot Templates -->
          <div class="w-full mb-4">
            <div class="text-xs font-bold text-gray-400 mb-2 text-left">🔥 热门模板</div>
            <div class="grid grid-cols-3 gap-2">
              <button
                @click="emit('close')"
                class="p-3 rounded-xl border-2 border-gray-100 hover:border-primary bg-gray-50 dark:bg-gray-800 text-center transition-all hover:bg-primary-light"
              >
                <div class="text-lg mb-1">📖</div>
                <div class="text-xs font-bold text-gray-700 dark:text-gray-200">经典</div>
              </button>
              <button
                @click="emit('close')"
                class="p-3 rounded-xl border-2 border-gray-100 hover:border-primary bg-gray-50 dark:bg-gray-800 text-center transition-all hover:bg-primary-light"
              >
                <div class="text-lg mb-1">💎</div>
                <div class="text-xs font-bold text-gray-700 dark:text-gray-200">9漫画</div>
              </button>
              <button
                @click="emit('close')"
                class="p-3 rounded-xl border-2 border-gray-100 hover:border-primary bg-gray-50 dark:bg-gray-800 text-center transition-all hover:bg-primary-light"
              >
                <div class="text-lg mb-1">✨</div>
                <div class="text-xs font-bold text-gray-700 dark:text-gray-200">XP</div>
              </button>
            </div>
          </div>

          <!-- Main CTA: Join Group -->
          <button
            @click="joinGroup"
            class="w-full py-4 bg-gradient-to-r from-primary to-pink-500 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all mb-3 flex items-center justify-center gap-2"
          >
            <div class="i-carbon-chat text-xl" />
            <span>加入【我推的ACNG】交流群</span>
          </button>

          <!-- Bilibili -->
          <button
            @click="goToBilibili"
            class="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <svg class="w-5 h-5" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M777.514667 131.669333a53.333333 53.333333 0 0 0-48.426667 26.965334l-50.816 87.168a483.2 483.2 0 0 0-166.4-29.226667c-58.453333 0-114.346667 10.197333-167.082667 29.354667l-50.176-87.296a53.333333 53.333333 0 0 0-93.610666 52.138666L246.229333 289.834667c-112.554667 64.938667-189.696 182.997333-197.888 320.128-0.554667 9.173333-0.853333 18.261333-0.853333 27.264 0 6.058667 0.170667 12.16 0.469333 18.218666 6.058667 134.4 81.365333 249.514667 189.610667 312.362667a476.330667 476.330667 0 0 0 549.973333 0.256c108.416-62.805333 183.936-177.877333 190.122667-312.576 0.298667-6.058667 0.426-12.202667 0.426-18.261333 0-8.96-0.341333-17.962667-0.938667-27.050667-8.192-137.216-85.333333-255.488-197.930666-320.384l45.226666-78.122666a53.333333 53.333333 0 0 0-46.933333-80.042667zM337.024 624.128c-30.848 0-55.850667-27.605333-55.850667-61.696s25.002667-61.696 55.850667-61.696c30.848 0 55.850667 27.605333 55.850666 61.696s-25.002667 61.696-55.850666 61.696z m352.085333 0c-30.848 0-55.850667-27.605333-55.850666-61.696s25.002667-61.696 55.850666-61.696c30.848 0 55.850667 27.605333 55.850667 61.696s-25.002667 61.696-55.850667 61.696z" /></svg>
            <span>关注 @我推的祥子丶</span>
          </button>

          <!-- Skip -->
          <button
            @click="skip"
            class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            直接开始制作 →
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
