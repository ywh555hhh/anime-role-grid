<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useMagicKeys, watchDebounced, useStorage } from '@vueuse/core'
import { api } from '~/services/api'
import type { BgmSearchResultItem } from '~/types'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

const props = defineProps<{
    mode?: 'single' | 'streamer'
}>()

const emit = defineEmits(['add', 'close', 'clear'])



const input = ref<HTMLInputElement>()
const keyword = ref('')
const searchResult = shallowRef<BgmSearchResultItem[]>([])
const loading = ref(false)
const errorMessage = ref('')
const offset = ref(0)
const hasMore = ref(true)
const trendingList = shallowRef<any[]>([])
const trendingLoading = ref(true)
// UX优化: 记住用户上次选择的热门榜单周期，避免每次都要重新点击
const activePeriod = useStorage<'12h' | '24h' | 'week' | 'all'>('anime-grid-trending-period', 'week')

async function fetchTrending() {
  trendingLoading.value = true
  try {
    const res = await fetch(`/api/trending?period=${activePeriod.value}`)
    if (res.ok) {
        const data = await res.json()
        trendingList.value = (data.results || []) as BgmSearchResultItem[]
    }
  } catch (e) {
    console.warn('Failed to fetch trending:', e)
  } finally {
    trendingLoading.value = false
  }
}

watch(activePeriod, () => {
    fetchTrending()
})

onMounted(() => {
    fetchTrending()
})

// UX优化: 记住用户上次选择的Tab（搜索/自定义上传），避免每次都要重新点击
const activeTab = useStorage<'search' | 'custom'>('anime-grid-active-tab', 'search')
// UX优化: 记住用户上次选择的搜索类型，避免每次都要重新点击
const searchType = useStorage<'character' | 'anime' | 'manga' | 'novel' | 'game' | 'music' | 'real' | 'person'>('anime-grid-search-type', 'character')
const searchYear = ref('')

// Custom upload form states
const customName = ref('')
const customImageFile = ref<File | null>(null)
const originalImagePreview = ref<string | null>(null) // 原始图片
const finalImagePreview = ref<string | null>(null) // 裁剪后的预览
const fileInput = ref<HTMLInputElement | null>(null)
const cropperImageRef = ref<HTMLImageElement | null>(null)
const cropperInstance = shallowRef<Cropper | null>(null)
const cropError = ref('')
const uploadStep = ref<'upload' | 'adjust'>('upload') // 上传步骤
const isProcessing = ref(false)

const GRID_ASPECT_RATIO = 120 / 187 // match grid cell aspect ratio (width/height)
const TARGET_WIDTH = 800 // 导出宽度

const { escape } = useMagicKeys()
if (escape) {
  watch(escape, (v) => {
    if (v) emit('close')
  })
}

// Auto-search when keyword changes (debounced)
watchDebounced(
  [keyword, searchYear, searchType],
  () => {
    if (keyword.value) {
      handleSearch()
    } else {
      // FIX: Clear results if keyword is empty (User cleared input)
      searchResult.value = []
    }
  },
  { debounce: 800, maxWait: 2000 },
)

// When switching type, clear results or re-search
watch(searchType, () => {
  offset.value = 0
  if (keyword.value) handleSearch()
  else searchResult.value = []
})

async function handleSearch() {
  if (!keyword.value) return
  loading.value = true
  errorMessage.value = ''
  
  if (offset.value === 0) searchResult.value = [] 
  
  offset.value = 0
  hasMore.value = true
  
  try {
    // Ported: Use unified API service
    // Note: API wrapper now handles headers, mode, and filtering internally
    const results = await api.searchBangumi(keyword.value, searchType.value, searchYear.value)
    
    // API service defaults to offset 0 / limit 20. 
    // If we want pagination support in API service, we should add offset param there.
    // However, current api.searchBangumi hardcodes offset: 0.
    // We should explicitly add offset support to api.ts if we want loadMore to work.
    // For now, let's fix api.ts next, or pass custom args?
    // Wait, I just hardcoded offset: 0 in api.ts. That's a regression for Load More.
    // I will fix api.ts to accept offset in the next step.
    
    searchResult.value = results
    if (results.length < 20) hasMore.value = false
  } catch (e: unknown) {
    errorMessage.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  offset.value += 20
  
  try {
    // API now supports offset
    const results = await api.searchBangumi(keyword.value, searchType.value, searchYear.value, offset.value)
    if (results.length > 0) {
      searchResult.value = [...searchResult.value, ...results]
      if (results.length < 20) hasMore.value = false
    } else {
      hasMore.value = false
    }
  } catch (e: unknown) {
    errorMessage.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function handleAdd(item: BgmSearchResultItem | { id: string | number, name: string, images?: any, image?: string }, event?: MouseEvent) {
  // Determine analytics data
  const category = searchType.value === 'anime' || searchType.value === 'game' || searchType.value === 'manga' || searchType.value === 'novel' || searchType.value === 'music' 
    ? 'subject' 
    : searchType.value === 'real' || searchType.value === 'person' // 'real' maps to? usually person
      ? 'person'
      : 'character'; // Default or 'character'

  let subjectType = undefined;
  if ('platform' in item && item.platform) {
      subjectType = item.platform;
  } else if ('type' in item) {
       // Map numeric type if needed, or just use semantic searchType
       subjectType = searchType.value;
  }

  // Get Click Coordinates for animation logic in parent
  let rect = undefined
  if (event && event.target) {
     const target = (event.target as HTMLElement).closest('.group') || (event.target as HTMLElement)
     rect = target.getBoundingClientRect()
  }

  emit('add', {
    item: {
        id: item.id,
        name: item.name,
        image: (item as any).images?.large || (item as any).images?.grid || (item as any).image || (item as any).images?.common, // Fallback chain
        bangumiId: item.id,
        category: category, 
        subjectType: subjectType
    },
    rect
  })
  
  if (props.mode !== 'streamer') {
      emit('close')
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

function destroyCropper() {
  cropperInstance.value?.destroy()
  cropperInstance.value = null
}

async function initCropper() {
  if (!originalImagePreview.value) return
  await nextTick()
  if (!cropperImageRef.value) return

  destroyCropper()

  // 创建优化的 Cropper 实例
  cropperInstance.value = new Cropper(cropperImageRef.value, {
    aspectRatio: GRID_ASPECT_RATIO,
    viewMode: 1, // 限制裁剪框在画布内
    dragMode: 'move', // 拖拽模式
    autoCropArea: 1, // 自动裁剪区域
    background: false, // 移除背景网格
    responsive: true,
    restore: false,
    checkCrossOrigin: false,
    guides: true, // 显示辅助线
    center: true, // 显示中心指示器
    highlight: true, // 高亮裁剪区域
    cropBoxMovable: true, // 允许移动裁剪框
    cropBoxResizable: true, // 允许调整裁剪框大小
    toggleDragModeOnDblclick: false, // 禁用双击切换
  })

  // 初始化后立即生成预览
  updatePreview()
}

function updatePreview() {
  if (!cropperInstance.value) return

  const instance = cropperInstance.value
  const targetWidth = props.mode === 'streamer' ? 150 : TARGET_WIDTH
  const targetHeight = Math.round(targetWidth / GRID_ASPECT_RATIO)

  try {
    const canvas = instance.getCroppedCanvas({
      width: targetWidth,
      height: targetHeight,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    })

    const mime = props.mode === 'streamer' ? 'image/jpeg' : 'image/png'
    const quality = props.mode === 'streamer' ? 0.8 : 1.0
    const dataUrl = canvas.toDataURL(mime, quality)

    finalImagePreview.value = dataUrl
  } catch (error) {
    console.error('Preview update failed:', error)
  }
}

async function prepareCustomImage(file: File) {
  cropError.value = ''
  isProcessing.value = true

  if (!file.type.startsWith('image/')) {
    cropError.value = '仅支持图片文件'
    isProcessing.value = false
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    originalImagePreview.value = result
    customImageFile.value = file

    // 切换到调整步骤
    uploadStep.value = 'adjust'

    // 等待 DOM 更新后初始化裁剪器
    nextTick(() => {
      initCropper()
    })
  }

  reader.onerror = () => {
    cropError.value = '图片读取失败，请重试或选择其他文件'
    isProcessing.value = false
  }

  reader.readAsDataURL(file)
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    prepareCustomImage(file)
    target.value = ''
  }
}

function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    prepareCustomImage(file)
  }
}

function resetUpload() {
  destroyCropper()
  customName.value = ''
  customImageFile.value = null
  originalImagePreview.value = null
  finalImagePreview.value = null
  cropError.value = ''
  uploadStep.value = 'upload'
  isProcessing.value = false
}

function handleCustomAdd() {
  // 确保预览是最新的
  updatePreview()

  if (finalImagePreview.value) {
    emit('add', {
      id: `custom-${Date.now()}`,
      name: customName.value.trim() || '自定义图片',
      image: finalImagePreview.value,
    })
    emit('close')
    resetUpload()
  }
}

// 监听裁剪变化，实时更新预览
let updateTimer: ReturnType<typeof setInterval> | null = null
watch(() => cropperInstance.value, (instance) => {
  if (instance) {
    // 节流更新预览
    updateTimer = setInterval(() => {
      updatePreview()
    }, 500)
  } else if (updateTimer) {
    clearInterval(updateTimer)
    updateTimer = null
  }
})

onBeforeUnmount(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
  destroyCropper()
})

onMounted(() => {
  input.value?.focus()
})
</script>

<template>
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-200 overflow-hidden"
    :class="{
      'md:pr-64': mode === 'streamer', // Shift center to left (Dock 56 + extra padding)
      'p-4 md:p-8': true
    }"
    @click.self="emit('close')"
  >
    <div 
      class="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col relative overflow-hidden shadow-xl"
    >
        <!-- Close Button (Top Right) -->
        <button 
            class="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors z-[60]"
            @click="emit('close')"
            title="关闭"
        >
            <div i-carbon-close class="text-2xl" />
        </button>

      <div class="flex flex-col gap-4 p-6 h-full">
        <!-- Fix 1: Add pr-12 to prevent overlap with absolute Close Button -->
        <div class="relative shrink-0 flex items-center gap-3 pr-12 md:pr-16">
            <!-- Small Logo -->
            <img src="/logo.png" class="w-8 h-8 object-contain" />
            
            <div class="relative flex-1">
                <input
                ref="input"
                v-model="keyword"
                class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white text-lg text-black outline-none focus:border-primary transition-colors"
                placeholder="搜索角色..."
                type="text"
                @keydown.enter="handleSearch"
                >
                <!-- Search Icon / Spinner -->
                <div 
                class="absolute right-3 top-1/2 -translate-y-1/2 text-xl p-2 cursor-pointer hover:bg-gray-100 rounded-full transition-colors"
                @click="handleSearch"
                >
                <div i-carbon-search class="text-black" />
                </div>
            </div>
        </div>
    

    <p class="text-xs text-black px-1 ml-11 font-medium">
      提示：如果搜不到，请尝试输入<b>完整全名</b> (Bangumi 搜索较严格)。例如：`四宫`搜不到，就输入`四宫辉夜`。 
    </p>
    
    <div 
        class="flex-1 overflow-y-scroll overflow-x-hidden min-h-0 relative"
        style="scrollbar-gutter: stable;"
    >
      <!-- Tabs -->
      <div class="flex border-b-2 border-gray-200 mb-4 items-center">
        <!-- ... (Tabs unchanged) ... -->
        <button 
          class="flex-1 py-2 text-sm font-bold transition-colors relative"
          :class="activeTab === 'search' ? 'text-primary' : 'text-black hover:text-primary'"
          @click="activeTab = 'search'"
        >
          在线搜索
          <div v-if="activeTab === 'search'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
        </button>
        <button 
          class="flex-1 py-2 text-sm font-bold transition-colors relative"
          :class="activeTab === 'custom' ? 'text-primary' : 'text-black hover:text-primary'"
          @click="activeTab = 'custom'"
        >
          自定义上传
          <div v-if="activeTab === 'custom'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
        </button>
        
        <button 
          class="flex-1 py-2 text-sm font-bold text-gray-500 hover:text-red-500 transition-colors flex items-center justify-center gap-1"
          @click="emit('clear')"
        >
          <div i-carbon-trash-can />
          <span>清空此格</span>
        </button>
      </div>

      <!-- Search Tab Content -->
      <div v-if="activeTab === 'search'">
        
        <!-- Filters (unchanged) -->
        <div class="flex flex-col gap-2 mb-4 px-1">
          <div class="flex flex-wrap items-center justify-center gap-2">
             <button
               v-for="type in ['character', 'person', 'anime', 'manga', 'novel', 'game', 'music', 'real']"
               :key="type"
               class="px-3 py-1.5 text-xs font-bold rounded-full transition-all border border-transparent"
               :class="searchType === type ? 'bg-primary text-white shadow-md transform scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
               @click="searchType = type as any"
             >
               {{ 
                 type === 'character' ? '角色' :
                 type === 'person' ? '声优/人物' :
                 type === 'anime' ? '动画' :
                 type === 'manga' ? '漫画' :
                 type === 'novel' ? '小说' :
                 type === 'game' ? '游戏' :
                 type === 'music' ? '音乐' :
                 type === 'real' ? '三次元' : type
               }}
             </button>
          </div>

          <!-- Secondary Filters (Year) -->
          <div v-if="['anime', 'game'].includes(searchType)" class="flex items-center justify-center gap-2">
             <div class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200 hover:border-primary transition-colors focus-within:border-primary focus-within:bg-white w-32">
                 <div i-carbon-calendar class="text-gray-400 text-sm" />
                 <input 
                   v-model="searchYear"
                   type="text"
                   placeholder="年份 (如2024)"
                   class="bg-transparent border-none outline-none text-xs w-full text-black placeholder-gray-400 font-medium"
                 >
             </div>
          </div>
        </div>

        <!-- Trending Section (unchanged) -->
        <div v-if="!keyword && activeTab === 'search'" class="mb-8 relative">
             <!-- ... (Trending content unchanged) ... -->
             <div class="flex items-center justify-between mb-4 px-1">
                <div class="flex items-center gap-2">
                    <div class="i-carbon-fire text-primary text-lg animate-pulse" />
                    <h3 class="font-bold text-sm text-black">全站热门</h3>
                </div>
                <div class="flex bg-gray-100 rounded-lg p-1 gap-1">
                    <button 
                        v-for="p in ['week', '24h', 'all']" 
                        :key="p"
                        class="px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center justify-center min-w-[3em]"
                        :class="activePeriod === p ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                        @click="activePeriod = p as any"
                    >
                        {{ p === '24h' ? '日榜' : p === 'week' ? '周榜' : '总榜' }}
                    </button>
                </div>
            </div>
            
            <div v-if="trendingLoading" class="flex justify-center py-12">
                 <div i-carbon-circle-dash class="animate-spin text-3xl text-gray-300" />
            </div>

            <div v-else-if="trendingList.length > 0" class="flex flex-col gap-6">
                 <!-- ... (Trending Cards unchanged) ... -->
                 <div class="grid grid-cols-3 gap-3">
                     <div
                        v-for="item in trendingList.slice(0, 3)"
                        :key="item.id"
                        class="relative group cursor-pointer"
                        @click="handleAdd({
                            id: item.id,
                            name: item.name,
                            images: { large: item.images?.large || item.image, medium: item.images?.medium || item.image, grid: item.images?.grid || item.image, small: item.images?.small || item.image, common: item.images?.common || item.image },
                        } as any, $event)"
                      >
                         <div class="w-full aspect-[2/3] overflow-hidden rounded-xl bg-gray-100 relative shadow-md border-2" 
                              :class="trendingList.indexOf(item) === 0 ? 'border-yellow-400 ring-2 ring-yellow-200' : (trendingList.indexOf(item) === 1 ? 'border-gray-300' : 'border-orange-300')">
                            <div 
                               class="absolute top-0 left-0 z-10 px-2 py-1 text-xs font-black text-white rounded-br-xl shadow-sm flex items-center gap-1"
                               :class="trendingList.indexOf(item) === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : (trendingList.indexOf(item) === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' : 'bg-gradient-to-r from-orange-300 to-orange-500')"
                            >
                                <div v-if="trendingList.indexOf(item) === 0" class="i-carbon-trophy" />
                                <span>NO.{{ trendingList.indexOf(item) + 1 }}</span>
                            </div>
                            <img 
                                :src="item.image" 
                                class="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                                referrerpolicy="no-referrer"
                            >
                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-8">
                                <p class="text-white text-sm font-bold truncate text-center">{{ item.name }}</p>
                            </div>
                         </div>
                      </div>
                 </div>

                 <div v-if="trendingList.length > 3">
                    <h4 class="text-xs font-bold text-gray-500 ml-1 mb-2">更多热门 (4-{{ trendingList.length }})</h4>
                    <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        <div
                            v-for="item in trendingList.slice(3)"
                            :key="item.id"
                            class="relative group cursor-pointer"
                            @click="handleAdd({
                                id: item.id,
                                name: item.name,
                                images: { large: item.images?.large || item.image, medium: item.images?.medium || item.image, grid: item.images?.grid || item.image, small: item.images?.small || item.image, common: item.images?.common || item.image },
                            } as any, $event)"
                        >
                            <div class="w-full aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 relative shadow-sm border border-gray-100 group-hover:border-primary transition-colors">
                                <span class="absolute top-0 left-0 bg-black/60 text-white text-[10px] px-1.5 rounded-br-lg font-bold z-10">{{ trendingList.indexOf(item) + 1 }}</span>
                                <img 
                                    :src="item.image" 
                                    class="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                    referrerpolicy="no-referrer"
                                >
                                <div class="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                    <p class="text-white text-[10px] font-bold truncate text-center">{{ item.name }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>

            </div>
            
            <div v-else class="text-center py-12 flex flex-col items-center gap-2">
                 <div class="i-carbon-chart-line text-4xl text-gray-200" />
                 <p class="text-gray-400 text-xs">暂无数据，快去创造趋势！</p>
            </div>
            <div class="h-px bg-gray-100 my-6" />
        </div>

        <!-- Fix 2: Explicit loading State (Main Area) -->
        <div v-if="loading && keyword" class="flex flex-col items-center justify-center py-12 gap-3">
             <div i-carbon-circle-dash class="text-4xl text-primary animate-spin" />
             <p class="text-gray-400 text-sm font-medium">搜索中...</p>
        </div>

        <!-- Search Results -->
        <div v-else-if="searchResult.length" class="columns-2 md:columns-3 lg:columns-4 gap-4 pb-4 space-y-4">
          <div
            v-for="item in searchResult"
            :key="item.id"
            class="break-inside-avoid group flex flex-col gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors"
            @click="handleAdd(item, $event)"
          >
            <div class="w-full overflow-hidden rounded-lg bg-gray-100 relative">
              <img 
                :src="item.images?.large || item.images?.medium || item.images?.grid" 
                class="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                referrerpolicy="no-referrer"
              >
            </div>
            <p class="w-full text-center text-sm font-bold text-black px-1 truncate" :title="item.name">
              {{ item.name }}
            </p>
            <p v-if="'date' in item && item.date" class="w-full text-center text-xs text-gray-500 font-medium -mt-1 flex items-center justify-center gap-1">
               <span v-if="'platform' in item && item.platform" class="px-1 rounded bg-gray-100 text-[10px] text-gray-500 border border-gray-200">
                 {{ item.platform }}
               </span>
               {{ item.date.split('-')[0] }}
            </p>
          </div>
        </div>
        
        <!-- Load More Button -->
        <div v-if="searchResult.length && hasMore && !loading" class="flex justify-center pb-6">
          <button 
            class="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-bold text-black transition-colors flex items-center gap-2"
            :disabled="loading"
            @click="loadMore"
          >
            <div v-if="loading" i-carbon-circle-dash class="animate-spin" />
            <span>{{ loading ? '加载中...' : '加载更多' }}</span>
          </button>
        </div>

        <div v-else-if="errorMessage" class="flex flex-col items-center justify-center h-64 text-red-500 px-4 text-center">
          <div i-carbon-warning-filled class="text-4xl mb-2" />
          <p>{{ errorMessage }}</p>
        </div>
        
        <!-- Fix 3: Ensure this only shows if NOT loading and NO results -->
        <div v-else-if="keyword && !searchResult.length && !loading" class="flex flex-col items-center justify-center h-64 text-black">
          <div i-carbon-search class="text-4xl mb-2" />
          <p>未找到相关角色</p>
        </div>
      </div>

      <!-- Custom Upload Tab Content -->
      <div v-else class="p-4 flex flex-col gap-4">

        <!-- 错误提示 -->
        <div v-if="cropError" class="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <div i-carbon-warning-filled class="text-red-500 text-lg shrink-0" />
          <p class="text-sm text-red-600 font-medium">{{ cropError }}</p>
        </div>

        <!-- 步骤 1: 上传图片 -->
        <div v-if="uploadStep === 'upload'" class="flex flex-col gap-4">
          <!-- 名字输入 -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-black">角色名字 (可选)</label>
            <input
                v-model="customName"
                class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white text-black outline-none focus:border-primary transition-colors"
                placeholder="给图片起个名字..."
                type="text"
            >
          </div>

          <!-- 上传区域 -->
          <div
            class="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all relative"
            :class="{ 'pointer-events-none opacity-50': isProcessing }"
            @click="triggerFileInput"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleFileChange"
            >

            <div v-if="isProcessing" class="flex flex-col items-center gap-3">
              <div i-carbon-circle-dash class="text-5xl text-primary animate-spin" />
              <p class="text-sm text-gray-600 font-medium">正在加载图片...</p>
            </div>

            <div v-else class="flex flex-col items-center gap-3">
              <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <div i-carbon-upload class="text-3xl text-primary" />
              </div>
              <div class="text-center">
                <p class="text-base font-bold text-black mb-1">点击或拖拽上传图片</p>
                <p class="text-xs text-gray-500">支持 JPG、PNG、WEBP 等格式</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤 2: 调整和预览 -->
        <div v-else class="flex flex-col gap-4">
          <!-- 顶部操作栏 -->
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-black">调整裁剪</h3>
            <button
              @click="resetUpload"
              class="text-sm text-gray-600 hover:text-primary flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div i-carbon-arrow-left />
              <span>重新上传</span>
            </button>
          </div>

          <!-- 裁剪区域 -->
          <div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div class="aspect-[4/3] relative bg-black">
              <img
                ref="cropperImageRef"
                :src="originalImagePreview || ''"
                class="w-full h-full object-contain block"
                alt="裁剪图片"
              >
            </div>
          </div>

          <!-- 操作提示 -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div class="flex items-start gap-2">
              <div i-carbon-information-filled class="text-blue-500 text-lg shrink-0" />
              <div class="flex-1 text-sm">
                <p class="font-bold text-blue-900 mb-1">裁剪提示</p>
                <ul class="text-blue-700 space-y-1 text-xs">
                  <li>• 拖拽裁剪框调整位置</li>
                  <li>• 拖拽边角和边缘调整大小</li>
                  <li>• 双指缩放调整图片（移动端）</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- 预览区域 -->
          <div class="grid grid-cols-2 gap-4">
            <!-- 实时预览 -->
            <div class="flex flex-col gap-2">
              <p class="text-xs font-bold text-primary">实时预览</p>
              <div class="aspect-[2/3] rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-pink-100 border-2 border-primary shadow-lg">
                <img
                  v-if="finalImagePreview"
                  :src="finalImagePreview"
                  class="w-full h-full object-contain"
                  alt="预览"
                >
                <div v-else class="w-full h-full flex items-center justify-center">
                  <div i-carbon-circle-dash class="text-3xl text-primary animate-spin" />
                </div>
              </div>
            </div>

            <!-- 名字确认 -->
            <div class="flex flex-col gap-2">
              <p class="text-xs font-bold text-gray-600">确认信息</p>
              <div class="bg-gray-50 rounded-lg p-3 border border-gray-200 flex-1">
                <div v-if="customName" class="mb-2">
                  <p class="text-xs text-gray-600 mb-1">角色名字</p>
                  <p class="text-sm font-bold text-black">{{ customName }}</p>
                </div>
                <div v-else class="text-sm text-gray-500">未设置名字</div>
                <div class="text-xs text-gray-500 mt-2">
                  尺寸：{{ props.mode === 'streamer' ? '150x236' : '800x1253' }}px
                </div>
              </div>
            </div>
          </div>

          <!-- 确认按钮 -->
          <button
            class="btn w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-xl text-base"
            :disabled="!finalImagePreview"
            @click="handleCustomAdd"
          >
            <div class="flex items-center justify-center gap-2">
              <div i-carbon-checkmark-filled />
              <span>确认添加</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
  </div>
  </div>
</template>
