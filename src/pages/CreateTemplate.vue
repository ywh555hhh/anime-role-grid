<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
import Grid from '~/components/Grid.vue'
import * as QRCode from 'qrcode'
import { exportGridAsImage } from '~/logic/export' // Use existing logic
import type { GridItem } from '~/types'

console.log('CreateTemplate loaded')

const title = ref('')
const cols = ref(4)
const rowCount = ref(3) // Virtual helper
const list = ref<GridItem[]>([])

// State for steps
const step = ref<1 | 2>(1) // 1: Edit, 2: Preview/Share
const generatedImage = ref('')
const loading = ref(false)

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
  if (!title.value) return alert('请先输入一个响亮的标题！')
  
  loading.value = true
  try {
    // 1. Create Template in Backend first to get ID
    const res = await fetch('/api/template/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.value,
        type: 'grid',
        config: {
          cols: cols.value,
          items: list.value.map(i => i.label)
        }
      })
    })
    
    const data = await res.json()
    if (!data.id) throw new Error(data.error || '创建失败')
    
    // 2. Generate QR Code for this ID
    const shareUrl = `${window.location.origin}/t/${data.id}`
    const qrDataUrl = await QRCode.toDataURL(shareUrl, { margin: 1, width: 200 })
    
    captureData.id = data.id 

    // 3. Generate Image via CanvasGenerator (No HTML2Canvas)
    generatedImage.value = await exportGridAsImage(
        list.value, 
        'custom_viral', // Special ID 
        title.value, 
        'challenge-card', 
        false, 
        { cols: cols.value }, // Template Config
        qrDataUrl, // QR Code
        'challenge' // Variant
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
function copyLink() {
  const url = `${window.location.origin}/t/${captureData.id}`
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } else {
    alert('请手动复制链接')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-20">
    <Header />
    
    <!-- Step 1: Editor -->
    <div v-if="step === 1" class="container mx-auto max-w-4xl px-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
        <h1 class="text-3xl font-bold mb-8 text-center flex items-center justify-center gap-2">
           <div i-carbon-edit class="text-[#e4007f]" />
           <span>出题器</span>
        </h1>
        
        <!-- Controls -->
        <div class="grid md:grid-cols-2 gap-8 mb-8">
           <div class="space-y-4">
              <div>
                <label class="block text-sm font-bold mb-2 text-gray-600">① 标题 (必填)</label>
                <input 
                  v-model="title" 
                  type="text" 
                  placeholder="例如：我的二次元成分表"
                  class="w-full text-lg font-bold border-b-2 border-gray-200 focus:border-[#e4007f] outline-none py-2 bg-transparent transition-colors placeholder-gray-300"
                />
              </div>
              
              <div class="flex gap-4">
                 <div class="flex-1">
                    <label class="block text-sm font-bold mb-2 text-gray-600">② 列数</label>
                    <div class="flex flex-wrap items-center gap-2 bg-gray-100 rounded-lg p-1">
                       <button v-for="n in [1,2,3,4,5,6]" :key="n" @click="cols = n" class="flex-1 min-w-[30px] py-1 rounded-md text-sm font-bold transition-all" :class="cols === n ? 'bg-white text-[#e4007f] shadow-sm' : 'text-gray-400'">{{n}}</button>
                    </div>
                 </div>
                 <div class="flex-1">
                    <label class="block text-sm font-bold mb-2 text-gray-600">③ 行数</label>
                    <div class="flex flex-wrap items-center gap-2 bg-gray-100 rounded-lg p-1">
                       <button v-for="n in [1,2,3,4,5,6]" :key="n" @click="rowCount = n" class="flex-1 min-w-[30px] py-1 rounded-md text-sm font-bold transition-all" :class="rowCount === n ? 'bg-white text-[#e4007f] shadow-sm' : 'text-gray-400'">{{n}}</button>
                    </div>
                 </div>
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
                            :title="title || '预览标题'"
                            :customTitle="title"
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
          class="w-full py-4 bg-[#e4007f] text-white font-bold text-xl rounded-xl shadow-lg hover:shadow-pink-500/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 active:scale-95"
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
           <h2 class="text-2xl font-bold text-center text-[#e4007f]">挑战书已生成！</h2>
           <div class="bg-gray-100 rounded-lg p-2 flex justify-center">
               <img :src="generatedImage" class="max-h-[40vh] object-contain shadow-md rounded" />
           </div>
           
           <!-- Share Link Area -->
           <div class="bg-gray-50 rounded-lg p-3 flex flex-col gap-2">
               <div class="text-xs text-gray-500 font-bold">分享链接 (复制发送给好友)</div>
               <div class="flex items-center gap-2">
                   <div class="text-sm bg-white border border-gray-200 rounded px-2 py-1 flex-1 truncate select-all">{{ `${window.location.origin}/t/${captureData.id}` }}</div>
                   <button 
                     @click="copyLink" 
                     class="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold transition-colors"
                   >
                     {{ copied ? '已复制' : '复制' }}
                   </button>
               </div>
           </div>

           <p class="text-xs text-center text-gray-400">长按图片保存，或点击下方按钮</p>
           
           <button @click="downloadImage" class="w-full py-3 bg-[#e4007f] text-white font-bold rounded-xl">
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
