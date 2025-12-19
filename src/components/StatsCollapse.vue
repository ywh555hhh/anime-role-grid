<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGridStore } from '~/stores/gridStore'

const store = useGridStore()
const isOpen = ref(false)

const hasStats = computed(() => store.stats && Object.keys(store.stats).length > 0)
// Filter stats to only show slots that have votes
const sortedStats = computed(() => {
    if (!store.stats) return []
    return Object.entries(store.stats).map(([label, candidates]) => ({
        label,
        candidates: candidates as any[] // Temporarily cast to any[] or StatsCandidate[] if imported
    })).filter(item => item.candidates.length > 0)
})

function toggleOpen() {
    isOpen.value = !isOpen.value
    // Auto-load REMOVED per user request. 
    // User must click "Refresh/Load" manually.
}

function handleLoad() {
    store.loadStats('all')
}
</script>

<template>
  <div class="mt-8 border-t border-gray-100 pt-6">
    <!-- Toggle Header -->
    <button 
      @click="toggleOpen"
      class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
    >
      <div class="flex items-center gap-2">
        <div i-carbon-chart-relationship class="text-xl text-primary" />
        <span class="font-bold text-gray-700 group-hover:text-primary transition-colors">
            全民党争统计 
            <span class="text-xs font-normal text-gray-400 ml-2">(看看大家都选了谁)</span>
        </span>
      </div>
      <div 
        class="i-carbon-chevron-down text-gray-400 transition-transform duration-300"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Collapsible Content -->
    <div 
        v-if="isOpen"
        class="mt-4 animate-fade-in-down"
    >
        <!-- Manual Load / Refresh Button -->
        <div class="flex justify-center mb-6">
             <button 
                @click="handleLoad"
                class="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-full font-bold hover:bg-primary-hover transition-colors shadow-md hover:shadow-lg active:scale-95 transform duration-100"
             >
                <div v-if="store.statsLoading" class="i-carbon-circle-dash animate-spin" />
                <div v-else class="i-carbon-renew" />
                <span>{{ hasStats ? '刷新数据' : '点击加载' }}</span>
             </button>
        </div>

        <!-- Loading View (Only if loading) -->
        <div v-if="store.statsLoading" class="flex flex-col items-center justify-center py-8 gap-3">
             <div i-carbon-circle-dash class="animate-spin text-3xl text-gray-300" />
             <span class="text-xs text-gray-400">正在实时汇总全宇宙的投票...</span>
        </div>

        <!-- Empty State (Only if loaded and empty) -->
        <div v-else-if="!store.statsLoading && store.stats && !hasStats" class="text-center py-8 text-gray-400 text-sm">
            暂无数据，快来投出你的神圣一票！
        </div>

        <!-- Stats Grid -->
        <div v-else-if="hasStats && !store.statsLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            <div 
                v-for="slot in sortedStats" 
                :key="slot.label"
                class="bg-white border boundary-gray-200 rounded-xl p-3 shadow-sm"
            >
                <div class="text-xs font-bold text-gray-500 mb-3 border-b border-gray-100 pb-2 flex justify-between items-center">
                    <span>{{ slot.label }}</span>
                    <span class="i-carbon-trophy-filled text-yellow-400" />
                </div>
                
                <div class="space-y-3">
                    <!-- Top 3 Candidates -->
                    <div 
                        v-for="(cand, idx) in slot.candidates.slice(0, 3)"
                        :key="cand.id"
                        class="flex items-center gap-3"
                    >
                        <div 
                            class="w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full text-white shrink-0"
                            :class="idx === 0 ? 'bg-yellow-400' : (idx === 1 ? 'bg-gray-300' : 'bg-orange-300')"
                        >
                            {{ idx + 1 }}
                        </div>
                        
                        <div class="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                            <img :src="cand.image" class="w-full h-full object-cover">
                        </div>
                        
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-bold truncate">{{ cand.name }}</p>
                            <div class="w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                                <div 
                                    class="h-full bg-primary opacity-50" 
                                    :style="{ width: `${(cand.count / slot.candidates[0].count) * 100}%` }"
                                />
                            </div>
                        </div>
                        
                        <span class="text-[10px] font-mono text-gray-400 tabular-nums shrink-0">
                            {{ cand.count }}票
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
