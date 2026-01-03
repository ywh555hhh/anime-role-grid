<script setup lang="ts">
import { ref, computed } from 'vue';
import { presetService } from '../../platform/services/PresetService';
import { useWorkbench } from '../../platform/workbench/useWorkbench';

const emit = defineEmits<{
  (e: 'close'): void
}>();

const { activeView } = useWorkbench();
const searchQuery = ref('');
const currentCategory = ref('all');

// 1. All Presets
const allPresets = presetService.getAll();

// 2. Computed Categories
const categories = computed(() => {
    const groups: Record<string, number> = { 'all': allPresets.length };
    for (const p of allPresets) {
        const cat = p.category || 'other';
        groups[cat] = (groups[cat] || 0) + 1;
    }
    return groups;
});

// 3. Filtering
const filteredPresets = computed(() => {
    const query = searchQuery.value.toLowerCase().trim();
    
    return allPresets.filter(p => {
        // Category Filter
        if (currentCategory.value !== 'all' && (p.category || 'other') !== currentCategory.value) {
            return false;
        }

        // Search Filter
        if (!query) return true;
        const matchName = p.name.toLowerCase().includes(query);
        const matchTag = p.tags?.some(t => t.toLowerCase().includes(query));
        return matchName || matchTag;
    });
});

const handleSelect = async (preset: any) => {
    // Smart Persistence allows seamless switching without data loss
    await presetService.applyPreset(preset, useWorkbench());
    emit('close');
};
</script>

<template>
  <div class="bg-white dark:bg-gray-900 w-full h-full md:w-[90vw] md:h-[90vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
    <!-- Header -->
    <div class="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 md:gap-6 bg-white z-10">
        <div class="flex items-center justify-between w-full md:w-auto">
            <div>
                <h2 class="text-xl md:text-2xl font-bold text-gray-900 font-serif">模板画廊</h2>
                <p class="text-gray-500 text-xs md:text-sm mt-0.5">选择一个预设开始创作</p>
            </div>
            <!-- Mobile Close Button -->
            <button @click="emit('close')" class="md:hidden p-2 -mr-2 text-gray-400 hover:text-gray-900">
                <div class="i-carbon-close text-2xl" />
            </button>
        </div>

        <!-- Search Bar -->
        <div class="w-full md:flex-1 md:max-w-md relative group">
            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                <div class="i-carbon-search text-lg" />
            </div>
            <input 
                v-model="searchQuery"
                type="text" 
                placeholder="搜索模板名称、标签..."
                class="w-full bg-gray-50 border border-gray-200 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
        </div>

        <!-- Desktop Close Button -->
        <button @click="emit('close')" class="hidden md:block p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900">
            <div class="i-carbon-close text-xl" />
        </button>
    </div>

    <!-- Layout: Mobile Column / Desktop Row -->
    <div class="flex flex-col md:flex-row flex-1 min-h-0 bg-gray-50/50">
        <!-- Sidebar (Categories): Mobile Horizontal / Desktop Vertical -->
        <div class="w-full md:w-56 border-b md:border-b-0 md:border-r border-gray-100 p-2 md:p-4 md:space-y-1 overflow-x-auto md:overflow-y-auto bg-white shrink-0 flex md:flex-col gap-2 no-scrollbar">
            <h3 class="hidden md:block px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Categories</h3>
            <button 
                v-for="(count, cat) in categories"
                :key="cat"
                @click="currentCategory = cat"
                class="flex-shrink-0 md:w-full text-left px-4 py-2 md:py-3 rounded-lg font-medium transition-all flex items-center justify-between group relative overflow-hidden h-10 md:h-auto border md:border-none border-gray-100 md:bg-transparent"
                :class="currentCategory === cat ? 'bg-primary text-white shadow-md shadow-primary/20 border-primary' : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
            >
                <span class="capitalize z-10 text-sm whitespace-nowrap">{{ cat === 'all' ? '全部' : cat }}</span>
                <span 
                    class="ml-2 text-xs px-1.5 py-0.5 rounded-full z-10 transition-colors"
                    :class="currentCategory === cat ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'"
                >{{ count }}</span>
            </button>
        </div>

        <!-- Main Content -->
        <div class="flex-1 p-4 md:p-6 overflow-y-auto w-full">
             <!-- Empty State -->
             <div v-if="filteredPresets.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                 <div class="i-carbon-search text-6xl mb-4 opacity-20" />
                 <p class="text-lg font-medium">没有找到相关模板</p>
                 <p class="text-sm">尝试更换搜索关键词 或 切换分类</p>
             </div>

             <!-- Grid -->
             <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                 <button 
                    v-for="preset in filteredPresets"
                    :key="preset.id"
                    @click="handleSelect(preset)"
                    class="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left flex flex-col h-40 md:h-48 w-full shadow-sm"
                 >
                    <div class="h-1.5 w-full bg-gray-50 group-hover:bg-primary transition-colors duration-300"></div>
                    <div class="p-4 md:p-5 flex flex-col flex-1 relative w-full min-w-0 pointer-events-none">
                        <!-- BG Icon Decoration -->
                        <div class="absolute right-2 bottom-2 text-8xl md:text-9xl opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
                             <div class="i-carbon-grid" />
                        </div>

                        <!-- 1. Title -->
                        <div class="flex items-start justify-between gap-2 mb-2 w-full shrink-0">
                            <h3 class="font-bold text-gray-900 group-hover:text-primary transition-colors truncate w-full text-base md:text-lg" :title="preset.name">
                                {{ preset.name }}
                            </h3>
                        </div>
                        
                        <!-- 2. Footer: Template Tags vs Slot Tags -->
                        <div class="mt-auto relative w-full h-8 overflow-hidden">
                            <!-- State A: Template Tags (Default) -->
                            <div class="absolute inset-0 flex items-center gap-1.5 transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-2">
                                <span v-for="tag in preset.tags?.slice(0, 3)" :key="tag" class="text-[10px] px-2 py-0.5 rounded-md bg-gray-50 text-gray-400 border border-gray-100">
                                    {{ tag }}
                                </span>
                                <span v-if="(preset.tags?.length || 0) > 3" class="text-[10px] text-gray-300">...</span>
                            </div>

                            <!-- State B: Slot Tags Marquee (Hover) -->
                            <div 
                                v-if="preset.data?.config?.items?.length"
                                class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-y-0 translate-y-2 flex items-center"
                            >
                                <div class="w-full overflow-hidden relative">
                                    <div class="flex gap-2 animate-marquee whitespace-nowrap">
                                        <!-- Duplicate items for smooth loop -->
                                        <span v-for="(item, i) in preset.data.config.items" :key="i" class="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/20 font-medium shrink-0">
                                            {{ item }}
                                        </span>
                                        <span v-for="(item, i) in preset.data.config.items" :key="`dup-${i}`" class="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/20 font-medium shrink-0" aria-hidden="true">
                                            {{ item }}
                                        </span>
                                    </div>
                                    <!-- Gradient Masks -->
                                    <div class="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
                                    <div class="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                 </button>
             </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-marquee {
  animation: marquee 5s linear infinite;
}
/* Pause on hover needed? Maybe. Let's keep it running for 'stream' effect */
</style>
