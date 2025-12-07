<script setup lang="ts">


defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close', 'select', 'open-gallery'])

const TRENDING_OPTIONS = [
  {
    id: 'anime_2025',
    title: '我的2025年度动画果然有问题',
    description: '年度动画综合评选',
    icon: 'i-carbon-play-filled',
  },
  {
    id: 'game_2025',
    title: '我的2025年度游戏果然有问题',
    description: '年度游戏综合评选',
    icon: 'i-carbon-game-console',
  },
  {
    id: 'classic',
    title: '我的动漫角色喜好果然有问题',
    description: '经典角色喜好六边形',
    icon: 'i-carbon-user-favorite',
  }
]

function handleSelect(option: typeof TRENDING_OPTIONS[0]) {
  emit('select', { id: option.id, title: option.title })
  emit('close')
}

function handleMore() {
  emit('open-gallery')
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
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div 
        class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col items-center p-8 relative"
        @click.stop
      >
        <!-- Close Button -->
        <button 
          class="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600"
          @click="emit('close')"
        >
          <div i-carbon-close class="text-xl" />
        </button>

        <!-- Header -->
        <div class="text-center mb-8">
          <div class="text-4xl mb-4">🔥</div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">大家都在填什么？</h2>
          <p class="text-gray-500 dark:text-gray-400 text-sm">在这里选择一个最流行的模板开始吧</p>
        </div>

        <!-- Options -->
        <div class="w-full flex flex-col gap-3 mb-6">
          <button
            v-for="opt in TRENDING_OPTIONS"
            :key="opt.id"
            class="w-full flex items-center p-4 rounded-xl border-2 transition-all group text-left relative overflow-hidden bg-white hover:bg-pink-50 border-gray-100 hover:border-[#e4007f] text-gray-700 hover:text-[#e4007f]"
            @click="handleSelect(opt)"
          >
            <div 
              class="w-12 h-12 rounded-lg bg-pink-50 flex items-center justify-center mr-4 shadow-sm shrink-0 group-hover:bg-[#e4007f] transition-colors"
            >
              <div :class="[opt.icon, 'text-2xl text-[#e4007f] group-hover:text-white transition-colors']" />
            </div>
            <div class="flex-1 z-10">
              <div class="font-bold text-base mb-0.5">{{ opt.title }}</div>
              <div class="text-xs opacity-70 font-medium">{{ opt.description }}</div>
            </div>
            <div class="i-carbon-arrow-right text-xl opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all ml-2" />
          </button>
        </div>

        <!-- More Button -->
        <button 
          @click="handleMore"
          class="text-gray-500 hover:text-[#e4007f] font-bold text-sm flex items-center gap-1 transition-colors px-4 py-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <span>查看更多模板</span>
          <div i-carbon-chevron-right />
        </button>

      </div>
    </div>
  </Transition>
</template>
