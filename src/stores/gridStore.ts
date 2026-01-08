
import { createGlobalState, useStorage, useRefHistory } from '@vueuse/core'
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

    // --- Streamer Mode State ---
    const isStreamerMode = useStorage('anime-grid-mode-streamer', false)
    const isToolbarOpen = useStorage('anime-grid-toolbar-open', true)

    // Dock items are just Characters (no label needed)
    const dockItems = useStorage<GridItemCharacter[]>('anime-grid-dock-v1', [])

    // --- History (Undo/Redo) ---
    const { undo, redo, canUndo, canRedo } = useRefHistory(savedGrids, {
        deep: true,
        capacity: 20
    })

    // --- Image Pool (Memory Optimization) ---
    // Stores the actual Base64 data, indexed by UUID.
    // Detached from history to prevent deep cloning of heavy strings.
    const imagePool = useStorage<Record<string, string>>('anime-grid-image-pool-v1', {})

    // --- Legacy Migration (v1/v2 -> v2.1) ---
    // Detects if user has old data but no new data, and migrates it.
    const legacyGrids = useStorage<Record<string, GridItem[]>>('anime-grid-data-v1', {})
    if (Object.keys(legacyGrids.value).length > 0 && Object.keys(savedGrids.value).length === 0) {
        console.log('🔄 Migrating legacy data to v2 storage...')
        savedGrids.value = { ...legacyGrids.value }
    }

    // --- Persistence for Titles ---
    // Stores custom MAIN titles indexed by template ID (e.g. "My Anime Grid")
    const userDefinedTitles = useStorage<Record<string, string>>('anime-grid-user-titles-v1', {})

    // The current main title (User editable)
    const currentTitle = computed({
        get: () => {
            const tid = currentTemplateId.value
            return userDefinedTitles.value[tid] || ''
        },
        set: (val: string) => {
            userDefinedTitles.value[currentTemplateId.value] = val
        }
    })

    // The current template name (Read-only for users, fixed per template)
    const currentTemplateName = computed(() => {
        const tid = currentTemplateId.value
        const official = TEMPLATES.find(t => t.id === tid)
        if (official) return official.name
        // For custom templates, we store the template's own name in currentConfig
        return currentConfig.value?.templateName || '自定义模板'
    })
    const currentConfig = ref<any>(null)
    const isCustomMode = ref(false)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // --- Getters ---

    function resolveImage(character?: GridItemCharacter): string | undefined {
        if (!character) return undefined
        // 1. Prefer ImageReference (Memory Optimized)
        if (character.imageId) {
            return imagePool.value[character.imageId] || character.image
        }
        // 2. Fallback to inline image (Legacy)
        return character.image
    }

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
     * Helper to process image and strip it from the reactive object
     */
    function processImage(char: GridItemCharacter): GridItemCharacter {
        if (char.image && char.image.startsWith('data:image')) {
            // Is Base64, need to extract
            // Reuse existing ID or generate new
            const id = char.imageId || crypto.randomUUID()

            // Save to Pool
            imagePool.value[id] = char.image

            // Return lightweight object
            return {
                ...char,
                imageId: id,
                image: undefined // Strip heavy data
            }
        }
        return char
    }

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
                currentConfig.value = {
                    cols: official.cols,
                    items: official.items,
                    templateName: official.name, // Keep official name in config too
                    defaultTitle: official.defaultTitle
                }

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
                    currentConfig.value = {
                        ...template.config,
                        defaultTitle: template.title
                    }

                    // Merge strategy: Always rely on Server Config for "Labels" (Structure),
                    // but preserve Local Storage for "Characters" (Answers).
                    const existing = savedGrids.value[id] || []

                    savedGrids.value[id] = template.config.items.map((label, idx) => ({
                        label: label,
                        character: existing[idx]?.character
                    }))
                } catch (e: any) {
                    console.error('Failed to load custom template', e)
                    error.value = e instanceof Error ? e.message : '加载自定义模版失败'
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
            // Memory Optimization: Process image before saving to state
            const optimizedChar = character ? processImage(character) : undefined

            list[index] = { ...list[index], character: optimizedChar }
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



    // --- Dock Actions ---
    function addToDock(character: GridItemCharacter) {
        // Prevent duplicates by ID (or ImageID)
        const existing = dockItems.value.find(i => i.id === character.id)
        if (!existing) {
            // Memory Optimization: Process image before adding to Dock
            const optimizedChar = processImage(character)
            dockItems.value.push({ ...optimizedChar })
        }
    }

    function removeFromDock(index: number) {
        dockItems.value.splice(index, 1)
    }

    function clearDock() {
        if (confirm('确定要清空暂存区吗？')) {
            dockItems.value = []
        }
    }

    // Drag State
    const isDragging = ref(false)
    const isCanvasLocked = useStorage('anime-grid-canvas-locked', false)

    return {
        // State
        currentTemplateId,
        currentTitle,
        currentTemplateName, // NEW
        currentConfig,
        isCustomMode,
        isLoading,
        error,
        currentList,
        stats,
        statsLoading,
        statsError,

        // Streamer Mode
        isStreamerMode,
        isToolbarOpen,
        dockItems,
        isDragging,
        isCanvasLocked, // NEW
        canUndo,
        canRedo,

        // Actions
        loadTemplate,
        updateItem,
        saveToCloud,
        loadStats,

        // Dock Actions
        addToDock,
        removeFromDock,
        clearDock,
        resolveImage, // Public Helper


        undo,
        redo
    }
})

