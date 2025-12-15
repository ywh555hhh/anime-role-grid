<script setup lang="ts">
import { ref, reactive, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
import Grid from '~/components/Grid.vue'
import * as QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import type { GridItem } from '~/types'

console.log('CreateTemplate loaded')

const router = useRouter()
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
  if (list.value[payload.index]) {
    list.value[payload.index].label = payload.label
  }
}

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
    const qrDataUrl = await QRCode.toDataURL(shareUrl, { margin: 1, width: 120 })
    
    // 3. Render Capture Area
    // Wait for Vue to render the hidden elements
    captureData.title = title.value
    captureData.qr = qrDataUrl
    captureData.id = data.id 
    step.value = 2 // Move to step 2 (which shows success modal, but we need meaningful image first)
    
    await nextTick()
    await new Promise(r => setTimeout(r, 500)) // Wait for images/fonts

    // 4. Html2Canvas
    const element = document.getElementById('viral-capture-area')
    if (!element) throw new Error('Capture element not found')
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    })
    
    generatedImage.value = canvas.toDataURL('image/png')
    
  } catch (e: any) {
    alert('生成失败: ' + e.message)
    step.value = 1
  } finally {
    loading.value = false
  }
}

const captureData = reactive({
  title: '',
  qr: '',
  id: ''
})

function downloadImage() {
  const link = document.createElement('a')
  link.download = `challenge-${captureData.id}.png`
  link.href = generatedImage.value
  link.click()
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
               <img :src="generatedImage" class="max-h-[50vh] object-contain shadow-md rounded" />
           </div>
           <p class="text-xs text-center text-gray-500">长按图片保存，或点击下方按钮</p>
           
           <button @click="downloadImage" class="w-full py-3 bg-[#e4007f] text-white font-bold rounded-xl">
               保存图片
           </button>
           <button @click="step = 1; generatedImage = ''" class="w-full py-2 text-gray-500 font-bold">
               返回修改
           </button>
       </div>
    </div>

    <!-- Hidden Capture Area (Where the magic happens) -->
    <div class="fixed left-[9999px] top-0">
        <div id="viral-capture-area" class="w-[800px] bg-white p-8 flex flex-col items-center gap-6 relative overflow-hidden">
            <!-- Decorative Backgrounds -->
            <div class="absolute top-0 right-0 w-64 h-64 bg-pink-50 rounded-full blur-3xl -z-10 opacity-50"></div>
            <div class="absolute bottom-0 left-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -z-10 opacity-50"></div>

            <!-- Header -->
            <div class="text-center space-y-2 mt-4">
                 <div class="inline-block px-4 py-1 rounded-full bg-black text-white font-bold text-lg tracking-widest">CHALLENGE</div>
                 <h1 class="text-5xl font-bold text-gray-900 tracking-wider" style="font-family: 'Noto Serif SC', serif;">{{ captureData.title }}</h1>
                 <div class="w-32 h-1 bg-[#e4007f] rounded-full mx-auto"></div>
            </div>

            <!-- Grid -->
            <div class="w-full px-8 py-4">
               <!-- We use Grid component here in non-interactive mode -->
               <Grid 
                  :list="list" 
                  :cols="cols"
                  :forExport="true"
                  :title="''"
                  :customTitle="''"
                  :defaultTitle="''"
               />
               <!-- Note: We clear titles in Grid because we render them externally for better control -->
            </div>

            <!-- Footer -->
            <div class="w-full bg-gray-50 rounded-2xl p-6 flex items-center justify-between border-2 border-gray-100 mb-4">
                <div class="flex items-center gap-4">
                    <img src="/logo.png" class="w-16 h-16 object-contain" />
                    <div class="flex flex-col">
                        <span class="text-2xl font-bold text-gray-900">我推<span class="text-[#e4007f]">的</span>格子</span>
                        <span class="text-sm text-gray-500 font-bold tracking-widest">ANIME ROLE GRID</span>
                    </div>
                </div>
                
                <div class="flex items-center gap-4">
                    <div class="flex flex-col items-end">
                        <span class="text-sm font-bold text-gray-900">扫码接受挑战</span>
                        <span class="text-xs text-gray-400">长按识别二维码</span>
                    </div>
                    <img :src="captureData.qr" class="w-20 h-20 bg-white p-1 rounded-lg shadow-sm border border-gray-200" />
                </div>
            </div>
            
            <div class="text-xs text-gray-300 font-mono pb-2">Generated by Grid Generator</div>
        </div>
    </div>

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
