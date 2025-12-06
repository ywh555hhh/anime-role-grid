<script setup lang="ts">
import { ref, computed } from 'vue'
import { isMp4Supported } from '~/logic/video-export'

const props = defineProps<{
  modelValue: boolean
  loading?: boolean
  progress?: number
  statusText?: string
  lastExportFormat?: 'mp4' | 'webm' | null
}>()

const emit = defineEmits(['update:modelValue', 'start-export'])

const settings = ref({
  platform: 'tiktok', 
  speed: 'normal', 
  includeEmpty: false,
  format: isMp4Supported ? 'mp4' : 'webm'
})

// Auto-select WebM if MP4 is not supported
if (!isMp4Supported) {
    settings.value.format = 'webm'
}

const platformOptions = [
  { value: 'tiktok', label: '抖音 / TikTok (9:16)', icon: 'i-carbon-logo-tiktok' },
  { value: 'bili', label: 'B站 / 横屏 (16:9)', icon: 'i-carbon-play-filled' },
  { value: 'square', label: '正方形 (1:1)', icon: 'i-carbon-instagram' },
]

const speedOptions = [
  { value: 'fast', label: '快 (1.5s/格)' },
  { value: 'normal', label: '正常 (3s/格)' },
  { value: 'slow', label: '慢 (5s/格)' },
]

function close() {
  if (!props.loading) {
    emit('update:modelValue', false)
  }
}

function start() {
  emit('start-export', settings.value)
}

const showFormatGuide = computed(() => {
    return !props.loading && props.lastExportFormat === 'webm'
})
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="close">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 class="text-xl font-bold text-gray-900" style="font-family: 'Noto Serif SC', serif;">
            {{ showFormatGuide ? '导出完成' : '导出视频' }}
        </h3>
        <button 
          v-if="!loading"
          class="text-gray-400 hover:text-gray-900 transition-colors"
          @click="close"
        >
          <div i-carbon-close class="text-2xl" />
        </button>
      </div>

      <!-- Compatibility Guide (Post-Export WebM) -->
      <div v-if="showFormatGuide" class="p-6 bg-yellow-50 border-b border-yellow-100 animate-fade-in-down">
        <div class="flex items-start gap-3">
            <div class="i-carbon-warning-filled text-yellow-500 text-2xl shrink-0 mt-0.5" />
            <div class="flex flex-col gap-2">
                <h4 class="font-bold text-gray-900 text-base">⚠️ 视频无法保存到相册？</h4>
                <p class="text-sm text-gray-700 leading-relaxed">
                    您导出的 <b>WebM 格式</b> 在 iOS 相册或抖音中可能无法直接识别。推荐使用以下方案转换：
                </p>
                <div class="mt-2 flex flex-col gap-1.5 text-sm">
                    <div class="flex items-center gap-2">
                        <span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">电脑端</span>
                        <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" class="text-blue-600 hover:underline">
                            CloudConvert 在线转 MP4 &rarr;
                        </a>
                    </div>
                    <div class="flex items-center gap-2">
                         <span class="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">手机端</span>
                         <span class="text-gray-600">保存到【文件】，用 <b>剪映</b> 导入即可</span>
                    </div>
                </div>
                <button @click="close" class="mt-3 text-sm font-bold text-gray-500 hover:text-gray-900 text-left">
                    知道了，关闭窗口
                </button>
            </div>
        </div>
      </div>

      <!-- Body -->
      <div class="p-6 flex flex-col gap-6 overflow-y-auto">
        
        <!-- Progress View (When Loading) -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-8 gap-4">
          <div class="relative w-24 h-24">
            <div class="absolute inset-0 border-4 border-gray-100 rounded-full" />
            <div 
              class="absolute inset-0 border-4 border-[#e4007f] rounded-full border-t-transparent animate-spin" 
            />
            <div class="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#e4007f]">
                {{ Math.round((progress || 0) * 100) }}%
            </div>
          </div>
          <div class="text-center">
            <p class="text-lg font-bold text-gray-900">{{ statusText || '处理中...' }}</p>
            <p class="text-xs text-gray-400 mt-2">这也太酷了吧！请稍等片刻 ~</p>
          </div>
        </div>

        <!-- Settings View -->
        <div v-else class="flex flex-col gap-5">

          <!-- Format Selection -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-gray-700">导出格式</label>
            <div class="grid grid-cols-2 gap-3">
                <!-- MP4 Option -->
                <label 
                    class="relative flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all"
                    :class="[
                        settings.format === 'mp4' ? 'border-[#e4007f] bg-pink-50' : 'border-gray-200 hover:border-gray-300',
                        !isMp4Supported ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                    ]"
                >
                    <input type="radio" value="mp4" v-model="settings.format" :disabled="!isMp4Supported" class="sr-only">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-gray-900">MP4</span>
                        <span v-if="isMp4Supported" class="text-[10px] bg-[#e4007f] text-white px-1.5 rounded-sm">推荐</span>
                    </div>
                    <span class="text-xs text-gray-500">{{ isMp4Supported ? '兼容性好 / 极速' : '当前浏览器不支持' }}</span>
                    
                    <div v-if="settings.format === 'mp4'" class="absolute top-2 right-2 i-carbon-checkmark-filled text-[#e4007f]" />
                </label>

                <!-- WebM Option -->
                <label 
                    class="relative flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all"
                    :class="settings.format === 'webm' ? 'border-[#e4007f] bg-pink-50' : 'border-gray-200 hover:border-gray-300'"
                >
                    <input type="radio" value="webm" v-model="settings.format" class="sr-only">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-gray-900">WebM</span>
                        <span class="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded-sm">通用</span>
                    </div>
                    <span class="text-xs text-gray-500">体积小 / 需转换</span>

                    <div v-if="settings.format === 'webm'" class="absolute top-2 right-2 i-carbon-checkmark-filled text-[#e4007f]" />
                </label>
            </div>
          </div>
          
          <!-- Platform Selection -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-gray-700">尺寸 / 平台</label>
            <div class="grid grid-cols-1 gap-2">
              <button
                v-for="opt in platformOptions"
                :key="opt.value"
                class="flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left group"
                :class="settings.platform === opt.value ? 'border-[#e4007f] bg-pink-50 text-[#e4007f]' : 'border-gray-200 hover:border-gray-300 text-gray-600'"
                @click="settings.platform = opt.value"
              >
                <div :class="opt.icon" class="text-xl" />
                <span class="font-medium">{{ opt.label }}</span>
                <div 
                  v-if="settings.platform === opt.value" 
                  i-carbon-checkmark-filled 
                  class="ml-auto text-[#e4007f]" 
                />
              </button>
            </div>
          </div>

          <!-- Speed Selection -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-gray-700">播放速度</label>
            <div class="flex gap-2">
              <button
                v-for="opt in speedOptions"
                :key="opt.value"
                class="flex-1 py-2 rounded-lg border text-sm font-medium transition-colors"
                :class="settings.speed === opt.value ? 'bg-[#e4007f] text-white border-[#e4007f]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'"
                @click="settings.speed = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Include Empty Toggle -->
          <div 
            class="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 bg-white transition-colors select-none"
            @click="settings.includeEmpty = !settings.includeEmpty"
          >
            <div class="flex flex-col">
              <span class="text-sm font-bold text-gray-900">包含未填写格子</span>
              <span class="text-xs text-gray-500">如果关闭，视频将跳过空的内容</span>
            </div>
            <div 
              class="w-12 h-6 rounded-full relative transition-colors duration-200"
              :class="settings.includeEmpty ? 'bg-[#e4007f]' : 'bg-gray-300'"
            >
              <div 
                class="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow-sm"
                :class="settings.includeEmpty ? 'translate-x-6' : 'translate-x-0'"
              />
            </div>
          </div>

        </div>
      </div>

      <!-- Footer Action -->
      <div v-if="!loading" class="p-6 border-t border-gray-100 bg-gray-50">
        <button 
          class="w-full py-3.5 bg-[#e4007f] hover:bg-[#c90070] active:scale-[0.98] text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-200 flex items-center justify-center gap-2"
          @click="start"
        >
          <div i-carbon-video-filled class="text-lg" />
          <span>开始生成视频</span>
        </button>
      </div>

    </div>
  </div>
</template>
