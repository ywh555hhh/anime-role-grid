<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useMagicKeys, onClickOutside } from '@vueuse/core'

// V3 System Imports
import { ImagePool } from '../../core/systems/assets/ImagePool'
import { useWorld } from '../composables/useWorld'
import { createSetComponentCommand } from '../../core/ecs/command'
import type { ComponentData, EntityId } from '../../core/ecs/types'

// Composables
import { useImportSearch } from '../composables/import/useImportSearch'
import { useImageUpload } from '../composables/import/useImageUpload'
import type { BgmSearchResultItem } from '../../../types'

const props = defineProps<{
    show: boolean;
    initialTab?: 'search' | 'upload';
    mode?: 'single' | 'streamer'
}>()

const emit = defineEmits(['close'])

// --- State Management ---
const activeTab = ref<'search' | 'custom'>(props.initialTab === 'upload' ? 'custom' : 'search')
const GRID_ASPECT_RATIO = 120 / 212 
const CROP_EXPORT_WIDTH = 800

// --- Composables ---
const { 
  keyword, searchType, searchYear, searchResult, loading, errorMessage, hasMore,
  trendingList, trendingLoading, activePeriod,
  fetchTrending, loadMore, handleSearch 
} = useImportSearch()

const {
  fileInput, customName, customImagePreview, cropSource, cropError, cropperImageRef,
  triggerFileInput, handleFileChange, handleDrop, getCroppedImage
} = useImageUpload(GRID_ASPECT_RATIO)


// --- Import Logic ---
const pool = ImagePool.getInstance()
const { registry, history } = useWorld()
const isImporting = ref(false)

async function importToECS(imageUrl: string, name?: string) {
    if (isImporting.value) return
    isImporting.value = true

    try {
        const uuid = await pool.storeImage(imageUrl)
        const newEntityId = registry.createEntity()

        const visualData: ComponentData<'Visual'> = {
            src: uuid,
            type: 'image',
            visible: true,
            styleVariant: 'default'
        }
        const cmd1 = createSetComponentCommand(newEntityId, 'Visual', visualData)
        history.execute(cmd1)

        const transformData: ComponentData<'Transform'> = {
            x: 0, y: 0, z: 1, parentId: 'dock-zone' as EntityId
        }
        const cmd2 = createSetComponentCommand(newEntityId, 'Transform', transformData)
        history.execute(cmd2)

        registry.addComponent(newEntityId, 'Interaction', {
            isDraggable: true,
            isSelectable: true,
            isSelected: false,
            isHovered: false
        })

        if (props.mode !== 'streamer') {
            emit('close')
        }

    } catch (e) {
        console.error('Import failed', e)
        alert('导入失败: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
        isImporting.value = false
    }
}

// Wrapper for Grid Items
async function handleAdd(item: BgmSearchResultItem) {
    const imageUrl = item.images?.large || item.images?.common || item.images?.medium || item.images?.grid || item.image || item.images?.small
    if (!imageUrl) {
        alert('未找到该角色的图片')
        return
    }
    await importToECS(imageUrl, item.name)
}

// Wrapper for Custom Upload
async function handleCustomAdd() {
    const finalImage = getCroppedImage(CROP_EXPORT_WIDTH)
    if (!finalImage) return

    await importToECS(finalImage, customName.value.trim() || '自定义图片')
    
    // Reset Custom Form
    customName.value = ''
    // File input reset is handled in composable or requires explicit reset if needed
    // Logic simplification for UI feedback
}


// --- Lifecycle & Interactions ---
watch(() => props.show, (val) => {
    if (val) {
        nextTick(() => {
            if (!trendingList.value.length) fetchTrending()
        })
    }
}, { immediate: true })

const { escape } = useMagicKeys()
if (escape) {
  watch(escape, (v) => {
    if (v && props.show) emit('close')
  })
}

const dialogRef = ref<HTMLElement | null>(null)
onClickOutside(dialogRef, () => emit('close'))
</script>

<template>
  <div 
    v-if="show"
    class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-200 overflow-hidden p-4 md:p-8 font-sans"
  >
    <div 
      ref="dialogRef"
      class="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col relative overflow-hidden shadow-xl"
    >
        <!-- Close Button -->
        <button 
            class="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors z-[60]"
            @click="emit('close')"
            title="关闭"
        >
            <div i-carbon-close class="text-2xl" />
        </button>

      <div class="flex flex-col gap-4 p-6 h-full">
        <!-- Search Bar -->
        <div class="relative shrink-0 flex items-center gap-3 pr-12 md:pr-16">
            <div class="relative flex-1">
                <input
                v-model="keyword"
                class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white text-lg text-black outline-none focus:border-primary transition-colors focus:ring-2 focus:ring-primary/20"
                placeholder="搜索角色..."
                type="text"
                @keydown.enter="() => handleSearch(false)"
                >
                <div 
                class="absolute right-3 top-1/2 -translate-y-1/2 text-xl p-2 cursor-pointer hover:bg-gray-100 rounded-full transition-colors"
                @click="() => handleSearch(false)"
                >
                <div i-carbon-search class="text-black" />
                </div>
            </div>
        </div>
    
    <p class="text-xs text-gray-500 px-1 ml-1 font-medium">
      提示：如果搜不到，请尝试输入<b>完整全名</b> (Bangumi 搜索较严格)。
    </p>
    
    <div 
        class="flex-1 overflow-y-scroll overflow-x-hidden min-h-0 relative"
        style="scrollbar-gutter: stable;"
    >
      <!-- Tabs -->
      <div class="flex border-b-2 border-gray-200 mb-4 items-center gap-4">
        <button 
          class="py-2 text-sm font-bold transition-colors relative"
          :class="activeTab === 'search' ? 'text-primary' : 'text-gray-500 hover:text-gray-800'"
          @click="activeTab = 'search'"
        >
          在线搜索
          <div v-if="activeTab === 'search'" class="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-primary" />
        </button>
        <button 
          class="py-2 text-sm font-bold transition-colors relative"
          :class="activeTab === 'custom' ? 'text-primary' : 'text-gray-500 hover:text-gray-800'"
          @click="activeTab = 'custom'"
        >
          自定义上传
          <div v-if="activeTab === 'custom'" class="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-primary" />
        </button>
      </div>

      <!-- Search Tab -->
      <div v-if="activeTab === 'search'">
        <div class="flex flex-col gap-2 mb-4 px-1">
          <div class="flex flex-wrap items-center gap-2">
             <button
               v-for="type in ['character', 'person', 'anime', 'manga', 'novel', 'game', 'music', 'real']"
               :key="type"
               class="px-3 py-1.5 text-xs font-bold rounded-full transition-all border"
               :class="searchType === type ? 'bg-primary text-white border-primary shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'"
               @click="searchType = type as any"
             >
               {{ 
                 type === 'character' ? '角色' : type === 'person' ? '声优/人物' : type === 'anime' ? '动画' :
                 type === 'manga' ? '漫画' : type === 'novel' ? '小说' : type === 'game' ? '游戏' :
                 type === 'music' ? '音乐' : type === 'real' ? '三次元' : type
               }}
             </button>
          </div>
          <div v-if="['anime', 'game'].includes(searchType)" class="flex items-center gap-2 mt-2">
             <div class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200 focus-within:border-primary focus-within:bg-white w-32 transition-colors">
                 <div i-carbon-calendar class="text-gray-400 text-sm" />
                 <input 
                   v-model="searchYear"
                   type="text"
                   placeholder="年份"
                   class="bg-transparent border-none outline-none text-xs w-full text-black placeholder-gray-400 font-medium"
                 >
             </div>
          </div>
        </div>

        <!-- Trending -->
        <div v-if="!keyword" class="mb-8 relative">
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
                 <div class="grid grid-cols-3 gap-3">
                     <div
                        v-for="item in trendingList.slice(0, 3)"
                        :key="item.id"
                        class="relative group cursor-pointer"
                        @click="handleAdd(item)"
                      >
                         <div class="w-full aspect-[2/3] overflow-hidden rounded-xl bg-gray-100 relative shadow-md border-2 transition-all duration-300 transform group-hover:-translate-y-1" 
                              :class="trendingList.indexOf(item) === 0 ? 'border-yellow-400' : (trendingList.indexOf(item) === 1 ? 'border-gray-300' : 'border-orange-300')">
                            <div 
                               class="absolute top-0 left-0 z-10 px-2 py-1 text-xs font-black text-white rounded-br-xl shadow-sm flex items-center gap-1"
                               :class="trendingList.indexOf(item) === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : (trendingList.indexOf(item) === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' : 'bg-gradient-to-r from-orange-300 to-orange-500')"
                            >
                                <div v-if="trendingList.indexOf(item) === 0" class="i-carbon-trophy" />
                                <span>NO.{{ trendingList.indexOf(item) + 1 }}</span>
                            </div>
                            <img 
                                :src="item.image" 
                                class="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                                referrerpolicy="no-referrer"
                            >
                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-6">
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
                            @click="handleAdd(item)"
                        >
                            <div class="w-full aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 relative shadow-sm border border-gray-100 group-hover:border-primary transition-all duration-300 group-hover:shadow-md">
                                <span class="absolute top-0 left-0 bg-black/60 text-white text-[10px] px-1.5 rounded-br-lg font-bold z-10">{{ trendingList.indexOf(item) + 1 }}</span>
                                <img 
                                    :src="item.image" 
                                    class="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                    referrerpolicy="no-referrer"
                                >
                                <div class="absolute bottom-0 left-0 right-0 bg-black/60 p-1 backdrop-blur-[2px]">
                                    <p class="text-white text-[10px] font-bold truncate text-center">{{ item.name }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
            
            <div v-else class="text-center py-12 flex flex-col items-center gap-2">
                 <div class="i-carbon-chart-line text-4xl text-gray-200" />
                 <p class="text-gray-400 text-xs">暂无数据</p>
            </div>
            <div class="h-px bg-gray-100 my-6" />
        </div>

        <!-- Search Results -->
        <div v-if="loading && keyword" class="flex flex-col items-center justify-center py-12 gap-3">
             <div i-carbon-circle-dash class="text-4xl text-primary animate-spin" />
             <p class="text-gray-400 text-sm font-medium">搜索中...</p>
        </div>
        <div v-else-if="searchResult.length" class="columns-2 md:columns-3 lg:columns-4 gap-4 pb-4 space-y-4">
          <div
            v-for="item in searchResult"
            :key="item.id"
            class="break-inside-avoid group flex flex-col gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
            @click="handleAdd(item)"
          >
            <div class="w-full overflow-hidden rounded-lg bg-gray-100 relative border border-gray-100 group-hover:border-primary/30 transition-colors">
              <img 
                :src="item.images?.large || item.images?.medium || item.images?.grid" 
                class="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                referrerpolicy="no-referrer"
              >
            </div>
            <p class="w-full text-center text-sm font-bold text-black px-1 truncate group-hover:text-primary transition-colors" :title="item.name">
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
        
        <div v-else-if="keyword && !searchResult.length && !loading" class="flex flex-col items-center justify-center h-64 text-black">
          <div i-carbon-search class="text-4xl mb-2" />
          <p>未找到相关角色</p>
        </div>
      </div>

      <!-- Custom Upload -->
      <div v-else class="p-4 flex flex-col gap-4">
        <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-black">角色名字 (可选)</label>
            <input 
                v-model="customName"
                class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white text-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="给图片起个名字..."
                type="text"
            >
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-bold text-black">上传图片</label>
          <div 
          class="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-all relative group"
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
              <img :src="customImagePreview" class="w-full h-full object-cover rounded-lg shadow-md group-hover:scale-105 transition-transform">
            </div>
            <div v-else i-carbon-image class="text-4xl text-black mb-2 group-hover:scale-110 transition-transform" />
            <p class="text-sm text-black font-medium">{{ customImagePreview ? '点击更换图片' : '点击或拖拽上传图片' }}</p>
          </div>
        </div>
        <div 
          v-if="cropSource" 
          class="border border-gray-200 rounded-lg bg-gray-50 p-4 flex flex-col gap-3"
        >
          <div class="flex-1 min-h-[260px] rounded-md border border-gray-200 overflow-hidden bg-white">
            <img 
              ref="cropperImageRef"
              :src="cropSource" 
              class="w-full h-full object-contain block"
              style="max-height: 420px;"
              alt="待裁切图片"
            >
          </div>
          <p v-if="cropError" class="text-sm text-red-500 font-semibold">{{ cropError }}</p>
        </div>
        <button 
          class="btn w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4 transform active:scale-[0.98]"
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
