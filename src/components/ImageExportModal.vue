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

function close() {
    emit('update:modelValue', false)
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
        <div 
          class="bg-white p-6 md:p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full transform transition-all border-2 border-primary max-h-[90vh] overflow-y-auto" 
          @click.stop
        >
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
           <h3 class="text-2xl font-bold mb-2 text-gray-900" style="font-family: 'Noto Serif SC', serif;">图片生成成功！</h3>
           <p class="text-gray-600 font-medium leading-relaxed mb-4">
            已尝试保存到相册。<br/>
            <span class="text-sm text-gray-400">如果未自动保存，请长按上方图片手动保存哦~</span>
           </p>
           
           <!-- Promo Text (Moved Up) -->
           <p class="text-xs text-primary font-bold mb-4 bg-primary-light py-2 rounded-lg">
               觉得好玩？你也可以制作一份考考朋友！
           </p>
           
           <div class="flex flex-col gap-3 w-full">
             
             <!-- 1. Bilibili (Primary Focus) -->
             <a 
                href="https://space.bilibili.com/36078469"
                target="_blank"
                class="w-full btn-primary text-sm"
             >
                <!-- Bilibili Icon -->
                <svg class="w-5 h-5" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M777.514667 131.669333a53.333333 53.333333 0 0 0-48.426667 26.965334l-50.816 87.168a483.2 483.2 0 0 0-166.4-29.226667c-58.453333 0-114.346667 10.197333-167.082667 29.354667l-50.176-87.296a53.333333 53.333333 0 0 0-93.610666 52.138666L246.229333 289.834667c-112.554667 64.938667-189.696 182.997333-197.888 320.128-0.554667 9.173333-0.853333 18.261333-0.853333 27.264 0 6.058667 0.170667 12.16 0.469333 18.218666 6.058667 134.4 81.365333 249.514667 189.610667 312.362667a476.330667 476.330667 0 0 0 549.973333 0.256c108.416-62.805333 183.936-177.877333 190.122667-312.576 0.298667-6.058667 0.426-12.202667 0.426-18.261333 0-8.96-0.341333-17.962667-0.938667-27.050667-8.192-137.216-85.333333-255.488-197.930666-320.384l45.226666-78.122666a53.333333 53.333333 0 0 0-46.933333-80.042667zM337.024 624.128c-30.848 0-55.850667-27.605333-55.850667-61.696s25.002667-61.696 55.850667-61.696c30.848 0 55.850667 27.605333 55.850666 61.696s-25.002667 61.696-55.850666 61.696z m352.085333 0c-30.848 0-55.850667-27.605333-55.850666-61.696s25.002667-61.696 55.850666-61.696c30.848 0 55.850667 27.605333 55.850667 61.696s-25.002667 61.696-55.850667 61.696z" /></svg>
                <span>关注开发者 @Shinomiya辉夜丶</span>
             </a>

             <!-- 2. Make Your Own -->
             <button 
                @click="router.push('/create')" 
                class="w-full btn-primary text-sm"
             >
               <div i-carbon-edit />
               <span>我也要制表</span>
             </button>

             <!-- 3. Share System -->
             <button 
               @click="emit('share')" 
               class="w-full btn-outline-primary"
             >
               <div v-if="canShare" i-carbon-share />
               <span>{{ canShare ? '调用系统分享' : '复制图片分享' }}</span>
             </button>
             
           </div>
          </div>
        </div>
    </Transition>
</template>
