<script setup lang="ts">
import { ref, watch, onMounted, computed, shallowRef, nextTick, onBeforeUnmount } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import type { ISource, SourceItem } from '../../platform/contracts';
import type { AssetPickerOptions } from '../../platform/api/assets';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

const props = defineProps<{
    options: AssetPickerOptions;
    sources: ISource[];
}>();

const emit = defineEmits<{
    (e: 'close', result?: any): void
}>();

// Responsive - Placeholder for future use, or remove if truly unused
// const isLargeScreen = useMediaQuery('(min-width: 1024px)');

// State
const searchQuery = ref(props.options.initialQuery || '');
const activeSourceId = ref<string>('');
const items = ref<SourceItem[]>([]);
const loading = ref(false);
const errorMsg = ref('');

// Trending State
const trendingItems = ref<SourceItem[]>([]);
const trendingLoading = ref(false);
const activePeriod = ref('week');

// Local Upload State
const isLocalSource = computed(() => activeSourceId.value === 'builtin.sources.local');
const localFile = ref<File | null>(null);
const localPreview = ref<string | null>(null);
const cropperInstance = shallowRef<Cropper | null>(null);
const cropImageRef = ref<HTMLImageElement | null>(null);
const fileName = ref('');

// Filters
const activeType = ref('character');
const activeYear = ref('');

// Search Types (V1 Parity)
const searchTypes = ['character', 'anime', 'manga', 'novel', 'game', 'music', 'person', 'real'];
const typeLabels: Record<string, string> = {
    character: '角色',
    person: '人物/声优',
    anime: '动画',
    manga: '漫画',
    novel: '小说',
    game: '游戏',
    music: '音乐',
    real: '三次元'
};

// Computed logic for active source
const getActiveSource = () => {
    return props.sources.find(s => s.id === activeSourceId.value);
};

// Search Action
const doSearch = async () => {
    const source = getActiveSource();
    if (!source) return;

    if (!searchQuery.value.trim()) {
        items.value = [];
        // Trigger trending fetch if enabled
        fetchTrending();
        return;
    }

    loading.value = true;
    errorMsg.value = '';

    try {
        // Pass options (type, year)
        const result = await source.search(searchQuery.value, 0, {
            type: activeType.value,
            year: activeYear.value
        });
        items.value = result.items;
    } catch (e: any) {
        errorMsg.value = e?.message || 'Search failed';
        items.value = [];
    } finally {
        loading.value = false;
    }
};

const fetchTrending = async () => {
    const source = getActiveSource();
    if (source?.recommend) {
        trendingLoading.value = true;
        try {
            trendingItems.value = await source.recommend({ period: activePeriod.value });
        } catch {
            trendingItems.value = [];
        } finally {
            trendingLoading.value = false;
        }
    } else {
        trendingItems.value = [];
    }
};

// Local Logic
const triggerFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => handleLocalFile(e.target.files[0]);
    input.click();
};

const handleDrop = (e: DragEvent) => {
    const file = e.dataTransfer?.files[0];
    if (file) handleLocalFile(file);
};

const handleLocalFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    localFile.value = file;
    fileName.value = file.name.split('.')[0] || 'Image';
    
    const reader = new FileReader();
    reader.onload = (e) => {
        localPreview.value = e.target?.result as string;
        nextTick(() => initCropper());
    };
    reader.readAsDataURL(file);
};

const initCropper = () => {
    if (cropperInstance.value) cropperInstance.value.destroy();
    if (!cropImageRef.value) return;

    cropperInstance.value = new Cropper(cropImageRef.value, {
        aspectRatio: 2/3, // Anime grid ratio roughly
        viewMode: 1,
        autoCropArea: 1,
        responsive: true
    });
};

const confirmUpload = () => {
    if (!cropperInstance.value) return;
    
    const canvas = cropperInstance.value.getCroppedCanvas({
        width: 600, // Reasonable size
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Create Item
    const item: SourceItem = {
        id: `local-${Date.now()}`,
        title: fileName.value || 'Custom Image',
        thumbnail: dataUrl,
        original: { file: localFile.value }
    };
    
    handleSelect(item);
};

// Cleanup
onBeforeUnmount(() => {
    cropperInstance.value?.destroy();
});


const onInput = useDebounceFn(doSearch, 600);

// Selection
const handleSelect = (item: SourceItem) => {
    const source = getActiveSource();
    if (!source) return;

    const entityData = source.normalize(item);
    emit('close', [entityData]);
};

// Init
onMounted(() => {
    if (props.sources.length > 0) {
        activeSourceId.value = props.sources[0]!.id;
    }
    // Initial fetch depends on query
    doSearch(); 
});

watch([activeSourceId, activeType, activeYear], () => {
    // Re-search when any filter changes
    if (searchQuery.value) doSearch();
    else fetchTrending();
});

watch(activePeriod, () => {
    fetchTrending();
});
</script>

<template>
  <div class="bg-white dark:bg-gray-900 w-[90vw] h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
    <!-- Header -->
    <div class="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 bg-white z-10">
        <div class="flex items-center justify-between w-full md:w-auto gap-4">
            <div>
                <h2 class="text-xl md:text-2xl font-bold text-gray-900 font-serif">{{ options.title || '选择资源' }}</h2>
                <p class="text-gray-500 text-xs md:text-sm mt-1 hidden md:block">从以下来源中搜索并添加</p>
            </div>
            
            <!-- Mobile Close Button -->
            <button @click="emit('close')" class="md:hidden p-2 -mr-2 text-gray-400">
                 <div class="i-carbon-close text-xl" />
            </button>
        </div>

        <!-- Search Bar / Upload Title -->
        <div v-if="!isLocalSource" class="flex-1 w-full md:max-w-md relative group">
            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                <div class="i-carbon-search text-lg" />
            </div>
            <input 
                v-model="searchQuery"
                @input="onInput"
                type="text" 
                placeholder="键入关键词搜索..."
                autofocus
                class="w-full bg-gray-50 border border-gray-200 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
        </div>
        <div v-else class="flex-1 w-full md:max-w-md flex justify-center">
            <h3 class="text-lg font-bold text-gray-700 bg-gray-100 px-6 py-2 rounded-full">本地图片上传</h3>
        </div>

        <!-- Desktop Close Button -->
        <button @click="emit('close')" class="hidden md:block p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900">
            <div class="i-carbon-close text-xl" />
        </button>
    </div>

    <div class="flex flex-1 min-h-0 bg-gray-50/50 flex-col md:flex-row">
        <!-- Sidebar (Source Switcher) -->
        <div class="w-full md:w-56 border-r border-gray-100 p-2 md:p-4 space-x-2 md:space-x-0 md:space-y-1 bg-white shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar">
            <h3 class="hidden md:block px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">数据源</h3>
            <button 
                v-for="source in sources"
                :key="source.id"
                @click="activeSourceId = source.id"
                class="shrink-0 md:w-full text-left px-3 py-1.5 md:px-4 md:py-3 rounded-full md:rounded-lg font-medium transition-all flex items-center justify-between group relative overflow-hidden"
                :class="activeSourceId === source.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-600 bg-gray-100 md:bg-transparent hover:bg-gray-200'"
            >
                <span class="z-10 text-xs md:text-sm">{{ source.name }}</span>
            </button>
        </div>

        <!-- Main Content -->
        <div class="flex-1 p-4 md:p-6 overflow-y-auto w-full flex flex-col items-stretch">
             
             <!-- A. Local Upload Mode -->
             <div v-if="isLocalSource" 
                  class="flex-1 flex flex-col gap-6 h-full"
                  @dragover.prevent
                  @drop.prevent="handleDrop"
             >
                 <div v-if="!localPreview" 
                      class="flex-1 border-4 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group min-h-[300px]"
                      @click="triggerFileInput"
                 >
                     <div class="i-carbon-cloud-upload text-6xl text-gray-300 group-hover:text-primary transition-colors mb-4" />
                     <p class="text-xl font-bold text-gray-500 group-hover:text-primary">点击或拖拽图片到这里</p>
                     <p class="text-sm text-gray-400 mt-2">支持 JPG, PNG, WEBP</p>
                 </div>
 
                 <div v-else class="flex flex-col h-full gap-4">
                      <div class="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
                          <!-- Cropper Area -->
                          <div class="flex-1 bg-black/5 rounded-2xl overflow-hidden relative min-h-[300px] flex items-center justify-center">
                              <img ref="cropImageRef" :src="localPreview" class="max-w-full block" />
                          </div>
                          
                          <!-- Preview & Actions Panel -->
                          <div class="w-full lg:w-72 flex flex-col gap-4 shrink-0">
                              <div class="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                                  <label class="text-xs font-bold text-gray-400 uppercase">名称</label>
                                  <input v-model="fileName" class="w-full mt-1 px-3 py-2 border rounded-lg font-bold focus:border-primary focus:outline-none" />
                              </div>
                              
                              <div class="flex-1 hidden lg:block"></div> <!-- Spacer -->
 
                              <div class="flex flex-col gap-2">
                                  <button @click="confirmUpload" class="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-hover active:scale-95 transition-all">
                                      确认裁剪并使用
                                  </button>
                                  <button @click="localPreview = null" class="w-full py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">
                                      重新选择
                                  </button>
                              </div>
                          </div>
                      </div>
                 </div>
             </div>
 
             <!-- B. Search/Trending Mode (Existing) -->
             <template v-else>
             
             <!-- Search Mode -->
             <template v-if="searchQuery">
                 <!-- Filters Area -->
                 <div class="flex flex-wrap gap-2 mb-4">
                     <button
                        v-for="type in searchTypes"
                        :key="type"
                        @click="activeType = type"
                        class="px-3 py-1 text-xs font-bold rounded-full transition-all border border-transparent"
                        :class="activeType === type ? 'bg-primary text-white shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'"
                     >
                        {{ typeLabels[type] || type }}
                     </button>
    
                     <!-- Year Filter -->
                     <div v-if="['anime', 'game'].includes(activeType)" class="flex items-center ml-2 border border-gray-200 rounded-full px-3 py-1 bg-white">
                          <div class="i-carbon-calendar text-gray-400 text-xs mr-2" />
                          <input 
                            v-model="activeYear"
                            type="text"
                            placeholder="年份"
                            class="w-12 text-xs outline-none bg-transparent"
                          />
                     </div>
                 </div>
    
                 <!-- Loading -->
                 <div v-if="loading" class="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[200px]">
                      <div class="i-carbon-circle-dash animate-spin text-3xl" />
                      <span class="text-xs">Connecting to Source...</span>
                 </div>
    
                 <!-- Empty -->
                 <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center flex-1 text-gray-400 min-h-[200px]">
                     <div class="i-carbon-search text-6xl mb-4 opacity-20" />
                     <p class="text-lg font-medium">没有找到结果</p>
                     <p class="text-sm">尝试更换搜索词或筛选条件</p>
                 </div>
    
                 <!-- Results Grid -->
                 <div v-else class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                     <button 
                        v-for="item in items"
                        :key="item.id"
                        @click="handleSelect(item)"
                        class="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left flex flex-col h-64 w-full"
                     >
                        <div class="h-48 w-full bg-gray-100 overflow-hidden relative">
                             <img 
                                v-if="item.thumbnail" 
                                :src="item.thumbnail" 
                                class="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                             />
                             <div v-else class="w-full h-full flex items-center justify-center text-gray-300">NO IMG</div>
                        </div>
                        <div class="p-3 flex flex-col flex-1 relative w-full min-w-0 bg-white">
                            <h3 class="font-bold text-gray-900 text-sm group-hover:text-primary transition-colors truncate w-full" :title="item.title">
                                {{ item.title }}
                            </h3>
                            <p class="text-xs text-gray-400 mt-1 truncate">ID: {{ item.id }}</p>
                        </div>
                     </button>
                 </div>
             </template>

             <!-- Trending Mode -->
             <template v-else>
                 <div class="flex items-center justify-between mb-6">
                     <h3 class="flex items-center gap-2 font-bold text-gray-800 text-lg">
                          <div class="i-carbon-fire text-orange-500" /> 热门趋势
                     </h3>
                     <div class="flex bg-gray-100 p-1 rounded-lg">
                         <button 
                             v-for="p in ['24h', 'week', 'all']" 
                             :key="p"
                             @click="activePeriod = p"
                             class="px-3 py-1 text-xs font-bold rounded-md transition-all"
                             :class="activePeriod === p ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'"
                         >
                             {{ p === '24h' ? '日榜' : p === 'week' ? '周榜' : '总榜' }}
                         </button>
                     </div>
                 </div>

                 <div v-if="trendingLoading" class="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[200px]">
                      <div class="i-carbon-circle-dash animate-spin text-3xl" />
                      <span class="text-xs">Fetching Hot List...</span>
                 </div>

                 <div v-else-if="trendingItems.length === 0" class="flex flex-col items-center justify-center flex-1 text-gray-400 min-h-[200px]">
                     <div class="i-carbon-chart-line text-6xl mb-4 opacity-20" />
                     <p class="text-lg font-medium">暂无数据</p>
                 </div>

                 <!-- Trending Grid -->
                 <div v-else class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                     <button 
                        v-for="(item, index) in trendingItems"
                        :key="item.id"
                        @click="handleSelect(item)"
                        class="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left flex flex-col h-64 w-full isolate transform-gpu"
                        :class="index < 3 ? 'ring-2 ring-pink-200 border-pink-300' : ''"
                     >
                        <!-- Rank Badge -->
                        <div v-if="index < 3" 
                             class="absolute top-0 left-0 z-20 px-3 py-1 text-sm font-black rounded-br-2xl rounded-tl-xl shadow-sm flex items-center gap-1 text-white"
                             :class="`bg-pink-500`"
                        >
                            <div class="i-carbon-trophy text-lg" />
                            <span class="italic">NO.{{ index + 1 }}</span>
                        </div>
                        <div v-else class="absolute top-0 left-0 z-20 bg-black/60 text-white text-[10px] px-2 py-1 rounded-br-xl rounded-tl-xl font-bold backdrop-blur-sm shadow-sm">
                            {{ index + 1 }}
                        </div>

                        <div class="h-48 w-full bg-gray-100 overflow-hidden relative">
                             <img 
                                v-if="item.thumbnail" 
                                :src="item.thumbnail" 
                                class="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                             />
                        </div>
                        <!-- Trending Card Footer -->
                        <div class="p-3 flex flex-col flex-1 relative w-full min-w-0 bg-white">
                            <h3 class="font-bold text-gray-900 text-sm group-hover:text-primary transition-colors truncate w-full" :title="item.title">
                                {{ item.title }}
                            </h3>
                            <div v-if="index < 3" class="absolute bottom-2 right-2 text-orange-500 text-xs flex items-center gap-0.5 animate-pulse">
                                <div class="i-carbon-fire" /> Hot
                            </div>
                        </div>
                     </button>
                 </div>
             </template>
             </template>
        </div>
    </div>
  </div>
</template>
