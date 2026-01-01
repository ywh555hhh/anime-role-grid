<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useBgmSearch, SearchError } from '../../../logic/search'; // Reuse logic
import type { BgmCharacterSearchResultItem, BgmSubjectSearchResultItem } from '~/types';

const props = defineProps<{
    initialQuery?: string;
    searchType?: string; // character, anime, game...
}>();

const emit = defineEmits<{
    (e: 'close', result?: any): void
}>();

// State
const keyword = ref(props.initialQuery || '');
const results = ref<(BgmCharacterSearchResultItem | BgmSubjectSearchResultItem)[]>([]);
const loading = ref(false);
const errorMsg = ref('');
const currentType = ref(props.searchType || 'character');

// Search Logic
const doSearch = async () => {
    if (!keyword.value.trim()) {
        results.value = [];
        return;
    }
    
    loading.value = true;
    errorMsg.value = '';

    try {
        const data = await useBgmSearch(
            keyword.value, 
            0, 
            currentType.value as any, 
            undefined // year
        );
        results.value = data;
    } catch (e: any) {
        errorMsg.value = e.message;
        results.value = [];
    } finally {
        loading.value = false;
    }
};

// Debounce
const onInput = useDebounceFn(doSearch, 600);

// Select Item
const selectItem = (item: any) => {
    // Standardize result structure for V3 Registry
    const result = {
        name: item.name,
        // BGM API returns 'images.grid' or 'images.medium'
        image: item.images?.grid || item.images?.medium || item.images?.large || item.images?.small || '',
        meta: {
            id: item.id,
            origin: 'bangumi',
            type: currentType.value
        }
    };
    emit('close', result);
};

// Initial Search
if (keyword.value) doSearch();

</script>

<template>
  <div class="bg-white w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
      <!-- Header -->
      <div class="p-4 border-b border-gray-100 flex gap-2 items-center bg-gray-50/50">
          <div class="i-carbon-search text-gray-400 text-xl" />
          <input 
            v-model="keyword"
            @input="onInput"
            class="flex-1 bg-transparent outline-none text-lg font-medium placeholder-gray-400"
            placeholder="Search anime, characters..."
            autofocus
          />
          <button @click="emit('close')" class="p-2 hover:bg-gray-200 rounded-lg text-gray-500">
              <div class="i-carbon-close text-xl" />
          </button>
      </div>

      <!-- Categories -->
      <div class="flex gap-2 p-2 px-4 border-b border-gray-50 overflow-x-auto no-scrollbar">
          <button 
             v-for="type in ['character', 'anime', 'game', 'manga', 'novel', 'real']"
             :key="type"
             @click="currentType = type; doSearch()"
             class="px-3 py-1 rounded-full text-sm transition-all border border-transparent"
             :class="currentType === type ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'"
          >
              {{ type.toUpperCase() }}
          </button>
      </div>

      <!-- Results / Content -->
      <div class="flex-1 overflow-y-auto min-h-[400px] p-4 bg-gray-50/30">
          <!-- Loading -->
          <div v-if="loading" class="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <div class="i-carbon-circle-dash animate-spin text-3xl" />
              <span class="text-xs">Connecting to Neural Network...</span>
          </div>

          <!-- Error -->
          <div v-if="errorMsg" class="flex flex-col items-center justify-center h-40 text-red-400 gap-2">
              <div class="i-carbon-warning text-3xl" />
              <span class="text-xs text-center px-10">{{ errorMsg }}</span>
          </div>

          <!-- Empty State (Placeholder for Trending) -->
          <div v-if="!loading && !results.length && !keyword" class="flex flex-col items-center justify-center h-60 text-gray-300 gap-4">
              <div class="i-carbon-chart-relationship text-5xl opacity-20" />
              <span class="font-serif">Data Link Disconnected.</span>
          </div>

          <!-- Grid -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                 v-for="item in results" 
                 :key="item.id"
                 @click="selectItem(item)"
                 class="group flex bg-white p-2 rounded-lg border border-gray-100 cursor-pointer hover:border-primary hover:shadow-md transition-all gap-3"
              >
                 <!-- Image -->
                 <div class="w-12 h-16 bg-gray-100 rounded shrink-0 overflow-hidden relative">
                     <img 
                        v-if="item.images?.medium || item.images?.grid"
                        :src="item.images?.medium || item.images?.grid" 
                        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                     />
                     <div v-else class="w-full h-full flex items-center justify-center text-gray-300 text-xs">NO IMG</div>
                 </div>

                 <!-- Tex -->
                 <div class="flex flex-col justify-center min-w-0">
                     <h4 class="font-bold text-gray-800 text-sm truncate font-serif group-hover:text-primary transition-colors">
                        {{ item.name }}
                     </h4>
                     <p v-if="(item as any).name_cn" class="text-xs text-gray-400 truncate mt-0.5">
                        {{ (item as any).name_cn }}
                     </p>
                     <div class="flex gap-1 mt-1">
                         <span class="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">{{ currentType }}</span>
                         <span class="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">ID: {{ item.id }}</span>
                     </div>
                 </div>
              </div>
          </div>
      </div>
  </div>
</template>
