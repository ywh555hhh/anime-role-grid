<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  modelValue: boolean // show
  imageSrc: string
  canShare: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'share'): void
}>()

const router = useRouter()
const GROUP_LINK = 'https://qm.qq.com/q/Jkf6Vgmyw8'

function close() {
    emit('update:modelValue', false)
}

function joinGroup() {
    window.open(GROUP_LINK, '_blank')
}
</script>

<template>
    <!-- Share Modal -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="modelValue" 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" 
        @click="close"
      >
        <!-- Outer Wrapper: Rounded Corners + Overflow Hidden -->
        <div 
          class="bg-white rounded-2xl shadow-2xl text-center max-w-sm w-full transform transition-all border-2 border-primary max-h-[90vh] overflow-hidden flex flex-col" 
          @click.stop
        >
          <!-- Inner Scrollable Area -->
          <div class="overflow-y-auto p-6 md:p-8 scrollbar-thin">
              <div class="w-full mb-4 flex items-center justify-center">
                <img 
                  v-if="imageSrc"
                  :src="imageSrc" 
                  class="w-full h-auto max-h-[50vh] object-contain rounded-lg shadow-sm border border-gray-100" 
                  alt="Generated Grid"
                />
                <div v-else class="w-32 h-32 mx-auto animate-bounce-low">
                   <div class="text-6xl">🎉</div>
                </div>
              </div>
               <h3 class="text-2xl font-bold mb-2 text-gray-900" style="font-family: 'Noto Serif SC', serif;">图片导出预览</h3>
               <p class="text-gray-600 font-medium leading-relaxed mb-4">
                已尝试保存到相册。<br/>
                <span class="text-sm text-gray-400">如果未自动保存，请长按上方图片手动保存哦~</span>
               </p>
               
               <!-- Promo: Join Group -->
               <div class="bg-gradient-to-r from-primary-light to-pink-50 dark:from-pink-900/30 dark:to-gray-800 rounded-xl p-4 mb-4 text-left">
                 <div class="flex items-start gap-3">
                   <div class="text-2xl">🎉</div>
                   <div class="flex-1">
                     <div class="font-bold text-sm text-gray-900 dark:text-white mb-1">做完啦！快来分享到群里吧~</div>
                     <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">和大家一起讨论你的格子</div>
                     <button
                       @click="joinGroup"
                       class="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                     >
                       <div class="i-carbon-chat" />
                       加入【我推的ACNG】交流群
                     </button>
                   </div>
                 </div>
               </div>
               
               <div class="flex flex-col gap-3 w-full">

                 <!-- 1. Join Group -->
                 <button
                   @click="joinGroup"
                   class="w-full btn-primary text-sm flex items-center justify-center gap-2"
                 >
                   <div class="i-carbon-chat" />
                   <span>加入交流群一起讨论</span>
                 </button>

                 <!-- 2. Make Your Own -->
                 <button
                    @click="router.push('/create')"
                    class="w-full btn-outline-primary text-sm"
                 >
                   <div i-carbon-edit />
                   <span>我也要制表</span>
                 </button>

                 <!-- 3. Share System -->
                 <button
                   @click="emit('share')"
                   class="w-full btn-outline-gray"
                 >
                   <div v-if="canShare" i-carbon-share />
                   <span>{{ canShare ? '调用系统分享' : '复制图片分享' }}</span>
                 </button>
                 
               </div>
          </div>
        </div>
      </div>
    </Transition>
</template>
