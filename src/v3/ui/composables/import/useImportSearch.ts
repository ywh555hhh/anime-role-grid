import { ref, shallowRef, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { api } from '../../../../services/api'
import type { BgmSearchResultItem } from '../../../../types'

export type SearchType = 'character' | 'anime' | 'manga' | 'novel' | 'game' | 'music' | 'real' | 'person'
export type TrendingPeriod = '12h' | '24h' | 'week' | 'all'

export function useImportSearch() {
    // State
    const keyword = ref('')
    const searchType = ref<SearchType>('character')
    const searchYear = ref('')

    const searchResult = shallowRef<BgmSearchResultItem[]>([])
    const loading = ref(false)
    const errorMessage = ref('')
    const offset = ref(0)
    const hasMore = ref(true)

    const trendingList = shallowRef<any[]>([])
    const trendingLoading = ref(false)
    const activePeriod = ref<TrendingPeriod>('week')

    // Actions
    const resetSearch = () => {
        offset.value = 0
        searchResult.value = []
        hasMore.value = true
        errorMessage.value = ''
    }

    const handleSearch = async (isLoadMore = false) => {
        if (!keyword.value) return

        if (!isLoadMore) {
            resetSearch()
        }

        loading.value = true
        errorMessage.value = ''

        try {
            const results = await api.searchBangumi(
                keyword.value,
                searchType.value,
                searchYear.value,
                isLoadMore ? offset.value : 0
            )

            if (isLoadMore) {
                searchResult.value = [...searchResult.value, ...results]
            } else {
                searchResult.value = results
            }

            if (results.length < 20) {
                hasMore.value = false
            }
        } catch (e: unknown) {
            errorMessage.value = e instanceof Error ? e.message : String(e)
        } finally {
            loading.value = false
        }
    }

    const loadMore = async () => {
        if (loading.value || !hasMore.value) return
        offset.value += 20
        await handleSearch(true)
    }

    const fetchTrending = async () => {
        trendingLoading.value = true
        try {
            let results: any[] = []
            try {
                // Attempt local API
                const res = await api.getTrending(activePeriod.value)
                results = res
            } catch (e) {
                // Fallback to Bangumi Rank
                console.warn('Local Trending API unavailable, falling back to Bangumi Rank')
                const bgmRes = await fetch(`https://api.bgm.tv/v0/subjects?limit=20&sort=rank`)
                const bgmData = await bgmRes.json()
                if (bgmData.data) {
                    results = bgmData.data.map((i: any) => ({
                        id: i.id,
                        name: i.name,
                        image: i.images?.large || i.images?.common,
                        images: i.images, // Keep full object
                        score: i.rating?.score,
                        date: i.date
                    }))
                }
            }
            trendingList.value = results
        } catch (e) {
            console.warn('Trending fetch completely failed', e)
        } finally {
            trendingLoading.value = false
        }
    }

    // Watchers
    watchDebounced(
        [keyword, searchYear, searchType],
        () => {
            if (keyword.value) {
                handleSearch(false)
            } else {
                searchResult.value = []
            }
        },
        { debounce: 800, maxWait: 2000 }
    )

    watch(searchType, () => {
        if (keyword.value) handleSearch(false)
    })

    watch(activePeriod, () => {
        fetchTrending()
    })

    return {
        keyword,
        searchType,
        searchYear,
        searchResult,
        loading,
        errorMessage,
        hasMore,
        trendingList,
        trendingLoading,
        activePeriod,
        fetchTrending,
        loadMore,
        handleSearch
    }
}
