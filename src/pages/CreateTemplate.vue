<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
import Grid from '~/components/Grid.vue'
import * as QRCode from 'qrcode'
import { exportGridAsImage } from '~/logic/export' // Use existing logic
import { api } from '~/services/api'
import type { GridItem } from '~/types'

console.log('CreateTemplate loaded')

const router = useRouter()
const mainTitle = ref('我的二次元成分表')
const templateName = ref('')
const creatorName = ref('')
const cols = ref(4)
const rowCount = ref(3) // Virtual helper
const list = ref<GridItem[]>([])

// State for steps
const step = ref<1 | 2>(1) // 1: Edit, 2: Preview/Share
const generatedImage = ref('')
const loading = ref(false)
const enableVoting = ref(false) // NEW: Voting Switch

// Init properties
function initGrid() {
  const total = cols.value * rowCount.value
  // Preserve existing labels if possible
  const oldList = list.value
  list.value = Array.from({ length: total }, (_, i) => ({
    label: oldList[i]?.label || `问题 ${i + 1}`,
    character: undefined
  }))
}

// Watch dimensions
watch([cols, rowCount], initGrid)
initGrid() // Run once

// Handle label updates from Grid.vue
function handleUpdateLabel(payload: { index: number, label: string }) {
  const item = list.value[payload.index]
  if (item) {
    item.label = payload.label
  }
}

const captureData = reactive({
  title: '',
  qr: '',
  id: ''
})

// Generate QR and Capture
async function generateChallengeCard() {
  if (!templateName.value) return alert('请填写模版名称！')
  
  loading.value = true
  try {
    // 1. Create Template using Service
    const data = await api.createTemplate({
        title: mainTitle.value || '我的二次元成分表',
        config: {
          cols: cols.value,
          items: list.value.map(i => i.label),
          creator: creatorName.value,
          templateName: templateName.value,
          voting: { enabled: enableVoting.value } // NEW
        }
    })
    
    if (!data.id) throw new Error('创建失败: ID missing')
    // Success, data.id is verified
    
    // 2. Generate QR Code for this ID
    const shareUrl = `${window.location.origin}/t/${data.id}`
    const qrDataUrl = await QRCode.toDataURL(shareUrl, { margin: 1, width: 200 })
    
    captureData.id = data.id 

    // 3. Generate Image via CanvasGenerator (No HTML2Canvas)
    generatedImage.value = await exportGridAsImage(
        list.value, 
        'custom_viral', // Special ID 
        mainTitle.value, 
        'challenge-card', 
        false, 
        { cols: cols.value, creator: creatorName.value }, 
        qrDataUrl, 
        'challenge',
        templateName.value // Template Name Subtitle
    )

    step.value = 2
    
  } catch (e: any) {
    alert('生成失败: ' + e.message)
    step.value = 1
  } finally {
    loading.value = false
  }
}

function downloadImage() {
  const link = document.createElement('a')
  link.download = `challenge-${captureData.id}.png`
  link.href = generatedImage.value
  link.click()
}

const copied = ref(false)

const shareLink = computed(() => {
  return `${window.location.origin}/t/${captureData.id}`
})

async function copyLink() {
  const text = shareLink.value
  
  // Strategy 1: Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      setTimeout(() => copied.value = false, 2000)
      return
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback...', err)
    }
  }

  // Strategy 2: Fallback (execCommand) - Better for some WebViews
  try {
    const textArea = document.createElement("textarea")
    textArea.value = text
    
    // Ensure it's not visible but part of DOM
    textArea.style.position = "fixed"
    textArea.style.left = "-9999px"
    textArea.style.top = "0"
    document.body.appendChild(textArea)
    
    textArea.focus()
    textArea.select()
    
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    
    if (successful) {
      copied.value = true
      setTimeout(() => copied.value = false, 2000)
    } else {
      throw new Error('execCommand returned false')
    }
  } catch (err) {
    console.error('Copy failed', err)
    alert(`复制失败，请手动长按链接复制：\n${text}`)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-20">
    <Header />
    
    <!-- Step 1: Editor -->
    <div v-if="step === 1" class="container mx-auto max-w-4xl px-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
        <h1 class="text-3xl font-bold mb-8 text-center flex flex-col md:flex-row items-center justify-center gap-4 relative">
            <button 
                @click="router.push('/')"
                class="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-full transition-all md:flex hidden"
                title="返回首页"
            >
                <div i-carbon-arrow-left class="text-2xl" />
            </button>
           
           <div class="flex items-center gap-2">
               <div i-carbon-edit class="text-primary" />
               <span>制表器</span>
           </div>
           
           <!-- Mobile Back Button -->
           <button 
                @click="router.push('/')"
                class="md:hidden text-sm text-gray-500 flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full"
            >
                <div i-carbon-arrow-left />
                返回首页
            </button>
        </h1>
        
        <!-- Controls -->
        <div class="grid md:grid-cols-2 gap-8 mb-8">
           <div class="space-y-4">
               <div>
                <label class="block text-sm font-bold mb-2 text-gray-600">① 标题 (Main Title)</label>
                <input 
                  v-model="mainTitle" 
                  type="text" 
                  placeholder="例如：我的二次元成分表"
                  class="w-full text-lg font-bold border-b-2 border-gray-200 focus:border-primary outline-none py-2 bg-transparent transition-colors placeholder-gray-300"
                />
              </div>

              <div>
                <label class="block text-sm font-bold mb-2 text-gray-600">② 模版名 (Template Name)</label>
                <input 
                  v-model="templateName" 
                  type="text" 
                  placeholder="例如：火影忍者人物表"
                  class="w-full text-lg font-bold border-b-2 border-gray-200 focus:border-primary outline-none py-2 bg-transparent transition-colors placeholder-gray-300"
                />
              </div>

              <div>
                <label class="block text-sm font-bold mb-2 text-gray-600">② 制表人 (可选)</label>
                <input 
                  v-model="creatorName" 
                  placeholder="留下你的大名"
                  class="w-full text-lg font-bold border-b-2 border-gray-200 focus:border-primary outline-none py-2 bg-transparent transition-colors placeholder-gray-300"
                />
              </div>
              
              <div class="flex gap-4">
                 <div class="flex-1">
                    <label class="block text-sm font-bold mb-2 text-gray-600">② 列数</label>
                    <div class="flex flex-wrap items-center gap-2 bg-gray-100 rounded-lg p-1">
                       <button v-for="n in [1,2,3,4,5,6]" :key="n" @click="cols = n" class="flex-1 min-w-[30px] py-1 rounded-md text-sm font-bold transition-all" :class="cols === n ? 'bg-white text-primary shadow-sm' : 'text-gray-400'">{{n}}</button>
                    </div>
                 </div>
                 <div class="flex-1">
                    <label class="block text-sm font-bold mb-2 text-gray-600">③ 行数</label>
                    <div class="flex flex-wrap items-center gap-2 bg-gray-100 rounded-lg p-1">
                       <button v-for="n in [1,2,3,4,5,6]" :key="n" @click="rowCount = n" class="flex-1 min-w-[30px] py-1 rounded-md text-sm font-bold transition-all" :class="rowCount === n ? 'bg-white text-primary shadow-sm' : 'text-gray-400'">{{n}}</button>
                    </div>
                 </div>
              </div>


               <!-- Voting Switch -->
               <div class="flex items-center justify-between bg-gray-50 p-4 rounded-xl border-2 border-transparent hover:border-pink-100 transition-colors">
                  <div class="flex flex-col">
                      <span class="font-bold text-gray-700 flex items-center gap-2">
                          <div class="i-carbon-chart-relationship text-primary" />
                          开启全民投票统计
                      </span>
                      <span class="text-xs text-gray-400">开启后，将汇总所有人的填表结果生成榜单</span>
                      <!-- Stats Benefits List -->
                       <div v-if="enableVoting" class="mt-2 space-y-1 text-[10px] text-gray-500 bg-white/50 p-2 rounded-lg border border-gray-100 animate-fade-in">
                           <div class="flex items-center gap-1.5">
                               <div i-carbon-chart-bar class="text-primary" />
                               <span>全网数据实时汇总</span>
                           </div>
                           <div class="flex items-center gap-1.5">
                               <div i-carbon-trophy class="text-yellow-500" />
                               <span>自动生成人气排行榜</span>
                           </div>
                           <div class="flex items-center gap-1.5">
                               <div i-carbon-user-multiple class="text-blue-500" />
                               <span>观众可互动投票应援</span>
                           </div>
                       </div>
                  </div>
                  
                  <button 
                    class="relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none"
                    :class="enableVoting ? 'bg-primary' : 'bg-gray-300'"
                    @click="enableVoting = !enableVoting"
                  >
                      <div 
                        class="absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300"
                        :class="enableVoting ? 'translate-x-5' : 'translate-x-0'"
                      />
                  </button>
               </div>
           </div>
           
           <div class="flex flex-col justify-center items-center bg-gray-50 rounded-xl p-4 text-center">
              <div class="text-sm font-bold text-gray-400 mb-2">预览 (点击文字可修改)</div>
               <!-- Interactive Preview Grid -->
               <div class="w-full overflow-x-auto pb-4">
                   <div class="min-w-[300px] flex justify-center">
                        <Grid 
                            :list="list" 
                            :cols="cols"
                            :title="templateName || '模版名称'"
                            :customTitle="mainTitle"
                            @update-label="handleUpdateLabel"
                            :forExport="true" 
                            :editable="true"
                        /> 
                   </div>
               </div>
           </div>
        </div>

        <button 
          @click="generateChallengeCard"
          :disabled="loading"
          class="w-full py-4 bg-primary text-white font-bold text-xl rounded-xl shadow-lg hover:shadow-primary/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 active:scale-95"
        >
          <div v-if="loading" class="i-carbon-circle-dash animate-spin" />
          <div v-else class="i-carbon-send-alt" />
          <span>生成挑战书</span>
        </button>
      </div>
    </div>
    
    <!-- Step 2: Success Modal -->
    <div v-if="step === 2" class="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
       <div class="bg-white rounded-2xl max-w-sm w-full p-6 flex flex-col gap-4 animate-scale-in">
           <h2 class="text-2xl font-bold text-center text-primary">挑战书已生成！</h2>
           <div class="bg-gray-100 rounded-lg p-2 flex justify-center">
               <img :src="generatedImage" class="max-h-[40vh] object-contain shadow-md rounded" />
           </div>
           
           <!-- Share Link Area -->
           <div class="bg-gray-50 rounded-lg p-3 flex flex-col gap-2">
               <div class="text-xs text-gray-500 font-bold">分享链接 (复制发送给好友)</div>
               <div class="flex items-center gap-2">
                   <div class="text-sm bg-white border border-gray-200 rounded px-2 py-1 flex-1 truncate select-all">{{ shareLink }}</div>
                   <button 
                     @click="copyLink" 
                     class="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold transition-colors"
                   >
                     {{ copied ? '已复制' : '复制' }}
                   </button>
               </div>
           </div>

           <p class="text-xs text-center text-gray-400">长按图片保存，或点击下方按钮</p>
           
           <button @click="downloadImage" class="w-full py-3 bg-primary text-white font-bold rounded-xl">
               保存图片
           </button>
           <button @click="step = 1; generatedImage = ''" class="w-full py-2 text-gray-500 font-bold">
               返回修改
           </button>
       </div>
    </div>
    <!-- Removed Hidden Capture Area -->


    <Footer />
  </div>
</template>

<style scoped>
.animate-scale-in {
  animation: scale-in 0.3s ease-out;
}
@keyframes scale-in {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
