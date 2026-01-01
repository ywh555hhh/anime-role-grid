<script setup lang="ts">
import { ref, computed } from 'vue';
import { presetService } from '../../platform/services/PresetService';
import { useWorkbench } from '../../platform/workbench/useWorkbench';

const emit = defineEmits<{
  (e: 'close'): void
}>();

const { activeView } = useWorkbench();

// Group presets by Category
const presets = presetService.getAll();
const categories = computed(() => {
    const groups: Record<string, typeof presets> = {};
    for (const p of presets) {
        const cat = p.category || 'Other';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(p);
    }
    return groups;
});

const currentCategory = ref('character');

const handleSelect = async (preset: any) => {
    if (confirm(`确定要应用模板 "${preset.name}" 吗？\n当前画布内容将被清空。`)) {
         await presetService.applyPreset(preset, useWorkbench());
         emit('close');
    }
};
</script>

<template>
  <div class="bg-white dark:bg-gray-900 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
    <!-- Header -->
    <div class="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div>
            <h2 class="text-2xl font-bold text-gray-900">官方模板画廊</h2>
            <p class="text-gray-500 text-sm mt-1">选择一个预设开始创作。支持不同类型的 Grid 和 视图。</p>
        </div>
        <button @click="emit('close')" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <div class="i-carbon-close text-xl" />
        </button>
    </div>

    <div class="flex flex-1 min-h-0">
        <!-- Sidebar (Categories) -->
        <div class="w-48 border-r border-gray-100 p-4 space-y-2 overflow-y-auto">
            <button 
                v-for="(list, cat) in categories"
                :key="cat"
                @click="currentCategory = cat"
                class="w-full text-left px-4 py-3 rounded-xl font-bold transition-colors flex items-center justify-between group"
                :class="currentCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-600 hover:bg-gray-50'"
            >
                <span class="capitalize">{{ cat }}</span>
                <span 
                    class="text-xs px-2 py-0.5 rounded-full"
                    :class="currentCategory === cat ? 'bg-white/20' : 'bg-gray-200'"
                >{{ list.length }}</span>
            </button>
        </div>

        <!-- Main Content -->
        <div class="flex-1 p-6 overflow-y-auto bg-gray-50/50">
             <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                 <button 
                    v-for="preset in categories[currentCategory]"
                    :key="preset.id"
                    @click="handleSelect(preset)"
                    class="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary hover:shadow-lg transition-all text-left flex flex-col h-40"
                 >
                    <div class="h-1.5 w-full bg-gray-100 group-hover:bg-primary transition-colors"></div>
                    <div class="p-4 flex flex-col flex-1">
                        <div class="flex items-start justify-between">
                            <h3 class="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">{{ preset.name }}</h3>
                            <div v-if="preset.tags" class="flex gap-1">
                                <span v-for="tag in preset.tags" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-bold">
                                    {{ tag }}
                                </span>
                            </div>
                        </div>
                        <p class="text-sm text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                            {{ preset.description }}
                        </p>
                        
                        <div class="mt-auto pt-4 flex items-center gap-2 text-xs text-gray-400">
                             <div class="i-carbon-grid" />
                             <span>Target: {{ preset.targetViewId.replace('builtin.views.', '') }}</span>
                        </div>
                    </div>
                 </button>
             </div>
        </div>
    </div>
  </div>
</template>
