<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '~/services/api'

const route = useRoute()
const loading = ref(false)
const error = ref('')
const rawData = ref(null) // Keep it loose matching to avoid type strictness

// Safe Computed for Dashboard
const dashboardData = computed(() => {
    if (!rawData.value) return []
    try {
        // Convert object { "slot1": [...], "slot2": [...] } to Array
        const entries = Object.entries(rawData.value as Record<string, any[]>)
        return entries.map(([label, candidates]) => {
            // Defensive Copy & Sort
            const safeCandidates = Array.isArray(candidates) ? [...candidates] : []
            return {
                label,
                candidates: safeCandidates.sort((a, b) => (b.count || 0) - (a.count || 0))
            }
        }).filter(item => item.candidates.length > 0)
    } catch (e) {
        console.error('Data parsing error', e)
        return []
    }
})

const totalVotes = computed(() => {
    let sum = 0
    dashboardData.value.forEach(slot => {
        slot.candidates.forEach(c => sum += (c.count || 0))
    })
    return sum
})

async function fetchData() {
    const id = route.params.id as string
    if (!id) return
    
    loading.value = true
    error.value = ''
    try {
        // Direct API call, using ID from URL directly
        const res = await api.getTemplateStats(id, 'all')
        rawData.value = res
    } catch (e: any) {
        error.value = e.message || '获取数据失败'
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchData()
})
</script>

<template>
  <div class="mt-8 border-t border-gray-100 pt-8 pb-10">
    
    <!-- Header & Controls -->
    <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
             <div class="p-2 bg-pink-50 rounded-lg text-primary">
                 <div i-carbon-analytics class="text-2xl" />
             </div>
             <div>
                 <h2 class="text-xl font-bold text-gray-800">数据统计</h2>
                 <p class="text-xs text-gray-400">基于全网用户提交结果实时汇总</p>
             </div>
        </div>
        <button 
            @click="fetchData"
            :disabled="loading"
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-bold transition-colors flex items-center gap-2"
        >
            <div v-if="loading" i-carbon-circle-dash class="animate-spin" />
            <div v-else i-carbon-renew />
            <span>刷新</span>
        </button>
    </div>

    <!-- Rules / Disclaimer -->
    <div class="mb-5 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50/50">
        <div class="flex flex-col gap-1 text-[10px] text-gray-400 leading-relaxed">
            <div class="flex items-start gap-2">
                <div class="bg-gray-200 text-gray-600 px-1 rounded text-[9px] font-bold mt-0.5">BETA</div>
                <span>本功能为测试版，防刷票机制较弱 (Do not take it seriously)。</span>
            </div>
            <div class="flex items-start gap-1.5 pl-1">
                <div i-carbon-information class="shrink-0 mt-0.5" />
                <span>仅基于简单的设备指纹去重，大家看个乐呵就好，请勿刷票哦~</span>
            </div>
        </div>
    </div>

    <!-- 2. ERROR STATE -->
    <div v-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg text-sm text-center">
        {{ error }}
    </div>

    <!-- 3. SUCCESS / DASHBOARD -->
    <div v-else-if="!loading && rawData" class="animate-fade-in">
        
        <!-- Total Counter -->
        <div v-if="totalVotes > 0" class="bg-gradient-to-r from-primary to-pink-500 text-white rounded-xl p-4 mb-6 shadow-md flex items-center justify-between">
            <span class="font-bold">累计投票</span>
            <span class="font-mono text-2xl font-black">{{ totalVotes }}</span>
        </div>

        <div v-if="dashboardData.length === 0" class="text-center py-8 text-gray-400">
            暂无数据
        </div>

        <!-- Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div 
                v-for="slot in dashboardData" 
                :key="slot.label"
                class="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden h-56"
            >
                <!-- Header: Fixed -->
                <div class="p-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <div class="text-xs font-bold text-gray-400 uppercase tracking-wider truncate" :title="slot.label">{{ slot.label }}</div>
                    <div class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-mono">{{ slot.candidates.length }}</div>
                </div>

                <!-- Scrollable Body -->
                <div class="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    
                    <!-- Top 1 (Prominent) -->
                    <div v-if="slot.candidates[0]" class="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50 border-dashed">
                        <div class="relative shrink-0">
                            <img 
                                :src="slot.candidates[0].image" 
                                class="w-14 h-14 rounded-lg object-cover object-top shadow-sm border border-gray-100"
                            />
                            <div class="absolute -top-1.5 -left-1.5 bg-yellow-400 text-white rounded-full p-0.5 shadow-sm">
                                <div i-carbon-trophy-filled class="text-xs" />
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-bold text-gray-800 text-sm truncate leading-tight">{{ slot.candidates[0].name }}</div>
                            <div class="text-xs text-primary font-bold mt-0.5">{{ slot.candidates[0].count }} 票</div>
                        </div>
                    </div>

                    <!-- Others List -->
                    <div class="space-y-2.5">
                        <div 
                            v-for="(cand, idx) in slot.candidates.slice(1)" 
                            :key="idx"
                            class="flex items-center gap-2 group"
                        >
                            <span class="w-4 text-center font-mono text-[10px] text-gray-300 group-hover:text-gray-500 transition-colors">{{ idx + 2 }}</span>
                            <img :src="cand.image" class="w-6 h-6 rounded bg-gray-100 object-cover object-top shrink-0" />
                            <span class="flex-1 truncate text-xs text-gray-600 group-hover:text-black transition-colors">{{ cand.name }}</span>
                            <span class="text-[10px] text-gray-400 font-mono bg-gray-50 px-1 rounded">{{ cand.count }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <!-- 4. LOADING SKELETON -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        <div v-for="i in 3" :key="i" class="h-24 bg-gray-100 rounded-xl"></div>
    </div>

  </div>
</template>
