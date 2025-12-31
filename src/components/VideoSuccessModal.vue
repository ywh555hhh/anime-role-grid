<script setup lang="ts">
defineProps<{
  show: boolean
  format: 'mp4' | 'webm' | null
}>()

const emit = defineEmits(['close', 'open-join-group'])

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
    <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click="emit('close')">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-bounce-in max-h-[90vh]" @click.stop>
        <div class="overflow-y-auto scrollbar-thin flex-1 min-h-0">
            <!-- Header -->
            <div class="p-6 bg-pink-50 border-b border-pink-100 flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-pink-100">
                    <div class="i-carbon-checkmark-filled text-primary text-3xl" />
                </div>
                <div>
                    <h3 class="font-bold text-gray-900 text-lg">导出请求已发送 🎉</h3>
                    <p class="text-xs text-gray-500">视频正在生成或下载中...</p>
                </div>
            </div>

            <!-- Body / Tips -->
            <div class="p-6 flex flex-col gap-4">
                <div class="flex flex-col gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    
                    <!-- Recommended Environment -->
                    <div class="flex gap-2 items-start">
                        <div class="i-carbon-thumbs-up-filled text-lg shrink-0 mt-0.5 text-primary" />
                        <div class="flex flex-col gap-1">
                            <span class="font-bold text-gray-900">推荐环境 (已验证):</span>
                            <div class="flex flex-wrap gap-2 text-xs">
                            <span class="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Windows Chrome</span>
                            <span class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded border border-gray-200">iOS Chrome</span>
                            </div>
                            <span class="text-[10px] text-gray-400 leading-tight mt-1">其他环境尚未充分测试，若遇问题建议更换上述环境。</span>
                        </div>
                    </div>

                    <div class="w-full h-px bg-gray-200" />

                    <!-- iOS Tip -->
                    <div class="flex gap-2 items-start">
                        <div class="i-carbon-logo-apple text-lg shrink-0 mt-0.5" />
                        <div class="flex flex-col gap-1">
                            <span class="font-bold text-gray-900">iOS 用户小贴士:</span>
                            <span class="leading-relaxed text-xs">Safari 可能会弹窗询问下载。推荐点击分享按钮 -> <b class="text-primary">"存储到文件"</b> 以确保最稳妥保存。</span>
                        </div>
                    </div>

                    <div class="w-full h-px bg-gray-200" />

                    <!-- Feedback -->
                    <div class="flex gap-2 items-start">
                        <div class="i-carbon-debug text-lg shrink-0 mt-0.5 text-gray-500" />
                        <div class="flex flex-col gap-1">
                            <span class="font-bold text-gray-900">导出失败了？</span>
                            <span class="leading-relaxed text-xs">视频导出功能仍在 Beta 阶段。如有问题，欢迎 <b class="text-primary">加群反馈</b> 或提交 Issue，我们会尽快修复！</span>
                        </div>
                    </div>
                </div>

                <!-- Community CTA -->
                <button
                    @click="emit('open-join-group')"
                    class="w-full py-3 bg-pink-50 hover:bg-pink-100 text-primary font-bold rounded-xl transition-all border border-pink-100 flex items-center justify-center gap-2 group"
                >
                    <div class="i-carbon-group text-lg group-hover:scale-110 transition-transform" />
                    <span>加入交流群分享视频</span>
                </button>

                <button 
                    @click="emit('close')" 
                    class="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-200"
                >
                    好的，我去试试
                </button>
            </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes bounce-in {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-bounce-in {
  animation: bounce-in 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
</style>
