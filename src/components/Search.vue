<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useMagicKeys, watchDebounced } from '@vueuse/core'
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
const activePeriod = ref<'12h' | '24h' | 'week' | 'all'>('week')

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

const activeTab = ref<'search' | 'custom'>('search')
const searchType = ref<'character' | 'anime' | 'manga' | 'novel' | 'game' | 'music' | 'real' | 'person'>('character')
const searchYear = ref('')

// Custom upload form states
const customName = ref('')
const customImageFile = ref<File | null>(null)
const customImagePreview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const cropperImageRef = ref<HTMLImageElement | null>(null)
const cropperInstance = shallowRef<Cropper | null>(null)
const cropSource = ref<string | null>(null)
const cropError = ref('')

const GRID_ASPECT_RATIO = 120 / 187 // match grid cell aspect ratio (width/height)
const CROP_EXPORT_WIDTH = 800 // balanced size for crisp exports without heavy payload

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

function prepareCustomImage(file: File) {
  cropError.value = ''
  if (!file.type.startsWith('image/')) {
    cropError.value = '仅支持图片文件'
    return
  }
  customImageFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    customImagePreview.value = result
    cropSource.value = result
  }
  reader.onerror = () => {
    cropError.value = '图片读取失败，请重试或选择其他文件'
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

function destroyCropper() {
  cropperInstance.value?.destroy()
  cropperInstance.value = null
}

async function initCropper() {
  if (!cropSource.value) return
  await nextTick()
  if (!cropperImageRef.value) return
  destroyCropper()
  cropperInstance.value = new Cropper(cropperImageRef.value, {
    aspectRatio: GRID_ASPECT_RATIO,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 1,
    background: false,
    responsive: true,
    movable: true,
    zoomOnWheel: true,
  })
}

function applyCrop() {
  const instance = cropperInstance.value
  if (!instance) return null
  try {
    // Streamer Mode: Compress heavily for Dock (Thumbnail)
    // Standard: 800px. Streamer: 150px.
    const targetWidth = props.mode === 'streamer' ? 150 : CROP_EXPORT_WIDTH
    
    const canvas = instance.getCroppedCanvas({
      width: targetWidth,
      height: Math.round(targetWidth / GRID_ASPECT_RATIO),
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    })
    // Use JPEG 0.8 for thumbnails to save space, PNG for high quality
    const mime = props.mode === 'streamer' ? 'image/jpeg' : 'image/png'
    const quality = props.mode === 'streamer' ? 0.8 : undefined
    
    const dataUrl = canvas.toDataURL(mime, quality)
    customImagePreview.value = dataUrl
    return dataUrl
  } catch (error) {
    console.error('Crop failed:', error)
    cropError.value = '裁切失败，请重新选择图片'
    return null
  }
}

function handleCustomAdd() {
  let finalImage = customImagePreview.value
  if (cropperInstance.value) {
    const cropped = applyCrop()
    if (cropped) finalImage = cropped
  }

  if (finalImage) {
    emit('add', {
      id: `custom-${Date.now()}`,
      name: customName.value.trim() || '自定义图片', // Use custom name or default
      image: finalImage,
    })
    emit('close')
    // Reset
    customName.value = ''
    customImageFile.value = null
    customImagePreview.value = null
    cropSource.value = null
  }
}

watch(cropSource, async (val) => {
  if (val) {
    cropError.value = ''
    await initCropper()
  } else {
    destroyCropper()
  }
})

onBeforeUnmount(() => {
  destroyCropper()
})

onMounted(() => {
  input.value?.focus()
})
</script>

<template>
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-200"
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
        <div class="relative shrink-0 flex items-center gap-3 pr-8">
            <!-- Small Logo -->
            <img src="/logo.png" class="w-8 h-8 object-contain" />
            
            <div class="relative flex-1">
                <input
                ref="input"
                v-model="keyword"
                class="w-full px-4 py-3 rounded-lg border-2 border-black bg-white text-lg text-black outline-none focus:border-primary"
                placeholder="搜索角色..."
                type="text"
                @keydown.enter="handleSearch"
                >
                <div 
                class="absolute right-3 top-1/2 -translate-y-1/2 text-xl p-2 cursor-pointer hover:bg-gray-100 rounded-full transition-colors"
                @click="handleSearch"
                >
                <div v-if="loading" i-carbon-circle-dash class="animate-spin text-primary" />
                <div v-else i-carbon-search class="text-black" />
                </div>
            </div>
        </div>
    


    <p class="text-xs text-black px-1 ml-11 font-medium">
      提示：如果搜不到，请尝试输入<b>完整全名</b> (Bangumi 搜索较严格)。例如：`四宫`搜不到，就输入`四宫辉夜`。 
    </p>
    
    <div class="flex-1 overflow-y-auto min-h-0">
      <!-- Tabs -->
      <div class="flex border-b-2 border-gray-200 mb-4 items-center">
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
        
        <!-- Clear Button -->
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
        
        <!-- Filters -->
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

        <!-- Trending Section (Show when no keyword) -->
        <div v-if="!keyword && activeTab === 'search'" class="mb-8">
            <div class="flex items-center justify-between mb-4 px-1">
                <div class="flex items-center gap-2">
                    <div class="i-carbon-fire text-primary text-lg animate-pulse" />
                    <h3 class="font-bold text-sm text-black">全站热门</h3>
                </div>
                <!-- Time Period Tabs -->
                <div class="flex bg-gray-100 rounded-lg p-0.5">
                    <button 
                        v-for="p in ['week', '24h', 'all']" 
                        :key="p"
                        class="px-3 py-1 text-xs font-bold rounded-md transition-all"
                        :class="activePeriod === p ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                        @click="activePeriod = p as any"
                    >
                        {{ p === '24h' ? '日榜' : p === 'week' ? '本周' : '总榜' }}
                    </button>
                </div>
            </div>
            
            <div v-if="trendingLoading" class="flex justify-center py-12">
                 <div i-carbon-circle-dash class="animate-spin text-3xl text-gray-300" />
            </div>

            <div v-else-if="trendingList.length > 0" class="flex flex-col gap-6">
                 
                 <!-- Tier 1: Top 3 (Big Cards) -->
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
                            
                            <!-- Rank Badge -->
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
                            
                            <!-- Name Overlay -->
                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-8">
                                <p class="text-white text-sm font-bold truncate text-center">{{ item.name }}</p>
                            </div>
                         </div>
                      </div>
                 </div>

                 <!-- Tier 2: The Rest (4-63) - Unified Grid -->
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
                                <!-- Simple Name Overlay for small cards -->
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
            
             <!-- Divider -->
            <div class="h-px bg-gray-100 my-6" />
        </div>

        <div v-if="searchResult.length" class="columns-2 md:columns-3 lg:columns-4 gap-4 pb-4 space-y-4">
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
        <div v-if="searchResult.length && hasMore" class="flex justify-center pb-6">
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
        <div v-else-if="keyword && !loading" class="flex flex-col items-center justify-center h-64 text-black">
          <div i-carbon-search class="text-4xl mb-2" />
          <p>未找到相关角色</p>
        </div>
      </div>

      <!-- Custom Upload Tab Content -->
      <div v-else class="p-4 flex flex-col gap-4">
        
        <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-black">角色名字 (可选)</label>
            <input 
                v-model="customName"
                class="w-full px-4 py-3 rounded-lg border-2 border-black bg-white text-black outline-none focus:border-primary"
                placeholder="给图片起个名字..."
                type="text"
            >
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-bold text-black">上传图片</label>
          <div 
          class="border-2 border-dashed border-black rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors relative"
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
            <div v-if="customImagePreview" class="w-32 h-auto mb-2">
              <img :src="customImagePreview" class="w-full h-full object-cover rounded-lg shadow-md">
            </div>
            <div v-else i-carbon-image class="text-4xl text-black mb-2" />
            <p class="text-sm text-black font-medium">{{ customImagePreview ? '点击更换图片' : '点击或拖拽上传图片' }}</p>
          </div>
        </div>

        <div 
          v-if="cropSource" 
          class="border border-gray-200 rounded-lg bg-gray-50 p-4 flex flex-col gap-3"
        >
          <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-1 min-h-[260px] rounded-md border border-gray-200 overflow-hidden bg-white">
              <img 
                ref="cropperImageRef"
                :src="cropSource" 
                class="w-full h-full object-contain block"
                style="max-height: 420px;"
                alt="待裁切图片"
              >
            </div>
          </div>
          <p v-if="cropError" class="text-sm text-red-500 font-semibold">{{ cropError }}</p>
        </div>

        <button 
          class="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          :disabled="!customImagePreview"
          @click="handleCustomAdd"
        >
          确认添加
        </button>
      </div>
    </div>
  </div>
  </div>
  </div>
</template>
