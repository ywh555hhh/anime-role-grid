<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useMagicKeys, watchDebounced } from '@vueuse/core'
import { useBgmSearch } from '~/logic/search'
import type { BgmCharacterSearchResultItem } from '~/types'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'


const emit = defineEmits(['add', 'close', 'clear'])

const input = ref<HTMLInputElement>()
const keyword = ref('')
const searchResult = shallowRef<BgmCharacterSearchResultItem[]>([])
const loading = ref(false)
const errorMessage = ref('')
const offset = ref(0)
const hasMore = ref(true)

const activeTab = ref<'search' | 'custom'>('search')

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
  keyword,
  () => {
    if (keyword.value) {
      handleSearch()
    }
  },
  { debounce: 800, maxWait: 2000 },
)

async function handleSearch() {
  if (!keyword.value) return
  loading.value = true
  errorMessage.value = ''
  searchResult.value = []
  offset.value = 0
  hasMore.value = true
  
  try {
    const results = await useBgmSearch(keyword.value, 0)
    searchResult.value = results
    if (results.length < 20) hasMore.value = false
  } catch (e: any) {
    errorMessage.value = e.message
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  offset.value += 20
  
  try {
    const results = await useBgmSearch(keyword.value, offset.value)
    if (results.length > 0) {
      searchResult.value = [...searchResult.value, ...results]
      if (results.length < 20) hasMore.value = false
    } else {
      hasMore.value = false
    }
  } catch (e: any) {
    errorMessage.value = e.message
  } finally {
    loading.value = false
  }
}

function handleAdd(item: BgmCharacterSearchResultItem) {
  emit('add', {
    id: item.id,
    name: item.name,
    image: item.images.large,
  })
  emit('close')
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
    const canvas = instance.getCroppedCanvas({
      width: CROP_EXPORT_WIDTH,
      height: Math.round(CROP_EXPORT_WIDTH / GRID_ASPECT_RATIO),
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    })
    const dataUrl = canvas.toDataURL('image/png')
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
  <div class="flex flex-col gap-4 p-6 h-full">
    <div class="relative shrink-0 flex items-center gap-3">
      <!-- Small Logo -->
      <img src="/logo.png" class="w-8 h-8 object-contain" />
      
      <div class="relative flex-1">
        <input
          ref="input"
          v-model="keyword"
          class="w-full px-4 py-3 rounded-lg border-2 border-black bg-white text-lg text-black outline-none focus:border-[#e4007f]"
          placeholder="搜索角色..."
          type="text"
          @keydown.enter="handleSearch"
        >
        <div 
          class="absolute right-3 top-1/2 -translate-y-1/2 text-xl p-2 cursor-pointer hover:bg-gray-100 rounded-full transition-colors"
          @click="handleSearch"
        >
          <div v-if="loading" i-carbon-circle-dash class="animate-spin text-[#e4007f]" />
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
          :class="activeTab === 'search' ? 'text-[#e4007f]' : 'text-black hover:text-[#e4007f]'"
          @click="activeTab = 'search'"
        >
          搜索角色
          <div v-if="activeTab === 'search'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e4007f]" />
        </button>
        <button 
          class="flex-1 py-2 text-sm font-bold transition-colors relative"
          :class="activeTab === 'custom' ? 'text-[#e4007f]' : 'text-black hover:text-[#e4007f]'"
          @click="activeTab = 'custom'"
        >
          自定义上传
          <div v-if="activeTab === 'custom'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e4007f]" />
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
        <div v-if="searchResult.length" class="columns-2 md:columns-3 lg:columns-4 gap-4 pb-4 space-y-4">
          <div
            v-for="item in searchResult"
            :key="item.id"
            class="break-inside-avoid group flex flex-col gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors"
            @click="handleAdd(item)"
          >
            <div class="w-full overflow-hidden rounded-lg bg-gray-100 relative">
              <img 
                :src="item.images?.large || item.images?.medium || item.images?.grid" 
                class="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              >
            </div>
            <p class="w-full text-center text-sm font-bold text-black px-1" :title="item.name">
              {{ item.name }}
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
                class="w-full px-4 py-3 rounded-lg border-2 border-black bg-white text-black outline-none focus:border-[#e4007f]"
                placeholder="给图片起个名字..."
                type="text"
            >
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-bold text-black">上传图片</label>
          <div 
          class="border-2 border-dashed border-black rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#e4007f] transition-colors relative"
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
          class="w-full py-3 bg-[#e4007f] hover:bg-[#c0006b] text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          :disabled="!customImagePreview"
          @click="handleCustomAdd"
        >
          确认添加
        </button>
      </div>
    </div>
  </div>
</template>
