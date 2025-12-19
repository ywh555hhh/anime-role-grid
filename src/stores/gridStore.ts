
import { createGlobalState, useStorage } from '@vueuse/core'
import { ref, computed } from 'vue'
import type { GridItem, StatsResponse, GridItemCharacter } from '~/types'
import { api } from '~/services/api'
import { TEMPLATES } from '~/logic/templates'

/**
 * Grid Store: The "Brain" of the application.
 * Manages the current grid state, whether it's an official template or a custom one.
 */
export const useGridStore = createGlobalState(() => {
    // --- State ---

    // The ID of the current template (official or custom)
    // The ID of the current template (official or custom)
    // Persisted to sessionStorage so tabs are isolated but refresh-proof
    const currentTemplateId = useStorage('anime-grid-template-id', 'classic', globalThis.sessionStorage)

    // The definitive list of items in the grid
    // We use a map { [templateId]: GridItem[] } to persist data across template switches locally
    const savedGrids = useStorage<Record<string, GridItem[]>>('anime-grid-data-v2', {})

    // --- Legacy Migration (v1 -> v2) ---
    // Detects if user has old data but no new data, and migrates it.
    const legacyGrids = useStorage<Record<string, GridItem[]>>('anime-grid-data-v1', {})
    if (Object.keys(legacyGrids.value).length > 0 && Object.keys(savedGrids.value).length === 0) {
        console.log('🔄 Migrating legacy data to v2 storage...')
        savedGrids.value = { ...legacyGrids.value }
    }

    // Current Metadata
    const currentTitle = ref('')
    const currentConfig = ref<any>(null)
    const isCustomMode = ref(false)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // --- Getters ---

    const currentList = computed({
        get: () => {
            const tid = currentTemplateId.value
            // Initialize if empty
            if (!savedGrids.value[tid]) {
                savedGrids.value[tid] = []
            }
            return savedGrids.value[tid]
        },
        set: (val: GridItem[]) => {
            savedGrids.value[currentTemplateId.value] = val
        }
    })

    // --- Actions ---

    /**
     * Initialize and Load a Template
     * @param id Template ID (official or custom)
     */
    async function loadTemplate(id: string) {
        isLoading.value = true
        error.value = null
        currentTemplateId.value = id

        try {
            // 1. Check if Official
            const official = TEMPLATES.find(t => t.id === id)

            if (official) {
                isCustomMode.value = false
                currentTitle.value = official.name
                currentConfig.value = { cols: official.cols, items: official.items }

                // Merge with defaults if list is empty or partial
                const stored = savedGrids.value[id] || []
                if (stored.length !== official.items.length) {
                    // Re-initialize based on official structure protecting existing answers
                    const merged = official.items.map((label, idx) => ({
                        label,
                        character: stored[idx]?.character
                    }))
                    savedGrids.value[id] = merged
                }
            }
            else {
                // 2. Must be Custom
                isCustomMode.value = true
                try {
                    const template = await api.getTemplate(id)
                    currentTitle.value = template.title
                    currentConfig.value = template.config

                    // Init empty grid if needed
                    if (!savedGrids.value[id] || savedGrids.value[id].length === 0) {
                        savedGrids.value[id] = template.config.items.map(label => ({ label }))
                    }
                } catch (e: any) {
                    console.error('Failed to load custom template', e)
                    error.value = e.message || '加载自定义模版失败'
                }
            }
        } catch (e: any) {
            console.error('Unexpected error loading template', e)
            error.value = e.message
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Update a specific slot
     */
    function updateItem(index: number, character: GridItemCharacter | undefined) {
        const list = [...currentList.value]
        if (list[index]) {
            list[index] = { ...list[index], character }
            currentList.value = list
        }
        // Auto-save to cloud could happen here debounced
    }

    /**
     * Save to Cloud
     */
    async function saveToCloud() {
        if (!currentTemplateId.value) return

        await api.saveGrid({
            templateId: currentTemplateId.value,
            customTitle: currentTitle.value,
            items: currentList.value
        })
    }

    const stats = ref<StatsResponse | null>(null)
    const statsLoading = ref(false)
    const statsError = ref<string | null>(null)
    let abortController: AbortController | null = null

    async function loadStats(period: '24h' | 'week' | 'all' = 'all') {
        // 1. Cancel previous request if any
        if (abortController) {
            abortController.abort()
            abortController = null
        }

        // 2. Validation
        if (!currentTemplateId.value) {
            console.warn('[GridStore] No currentTemplateId, aborting')
            return
        }

        // 3. Reset State
        statsLoading.value = true
        statsError.value = null

        // 4. Create new Controller
        abortController = new AbortController()
        const signal = abortController.signal

        try {
            console.log('[GridStore] Loading stats...', { id: currentTemplateId.value })

            // 5. Race Condition: API Call vs Timeout (8s)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('请求超时 (8s)')), 8000)
            )

            // Note: api.getTemplateStats needs to support signal ideally, but for now we race the result
            // Since our fetch wrapper doesn't support signal yet, we just ignore the result on timeout
            const apiPromise = api.getTemplateStats(currentTemplateId.value, period)

            const res = await Promise.race([apiPromise, timeoutPromise]) as StatsResponse

            if (signal.aborted) return // Ignore if cancelled

            console.log('[GridStore] Stats loaded', res)
            stats.value = res
        } catch (e: any) {
            if (signal.aborted) return
            console.error('[GridStore] loadStats failed', e)
            statsError.value = e.message || '加载失败'
        } finally {
            if (!signal.aborted) {
                statsLoading.value = false
                abortController = null
            }
        }
    }

    return {
        // State
        currentTemplateId,
        currentTitle,
        currentConfig,
        isCustomMode,
        isLoading,
        error,
        currentList,
        stats, // NEW
        statsLoading, // NEW
        statsError, // NEW

        // Actions
        loadTemplate,
        updateItem,
        saveToCloud,
        loadStats // NEW
    }
})

