import { useStorage } from '@vueuse/core'
import { computed } from 'vue'
import type { GridItem } from '~/types'
import { TEMPLATES } from './templates'

// Persistent state for the current template ID
export const currentTemplateId = useStorage('anime-grid-template-id', 'classic')

// Persistent state for all grids data: { [templateId]: GridItem[] }
export const savedGrids = useStorage<Record<string, GridItem[]>>('anime-grid-data-v1', {})

// Legacy storage key for migration
const legacyList = useStorage<GridItem[]>('anime-grid-character-list-v2', [])

// Migration logic: If legacy data exists and 'classic' is empty, migrate it
if (legacyList.value.length > 0 && !savedGrids.value['classic']) {
    savedGrids.value['classic'] = legacyList.value
    // Optional: clear legacy list or keep it as backup? Let's keep it for safety but ignore it.
}

// Computed property to access the current list
export const list = computed({
    get: () => {
        const tid = currentTemplateId.value
        const template = TEMPLATES.find(t => t.id === tid) || TEMPLATES[0]!
        const savedList = savedGrids.value[tid] || []

        // Always use labels from the current template definition (code)
        // Only preserve the character data from storage
        return template.items.map((label, index) => ({
            label,
            character: savedList[index]?.character,
        }))
    },
    set: (val) => {
        savedGrids.value[currentTemplateId.value] = val
    }
})

export const name = useStorage('anime-grid-character-name', '我的动画角色喜好表')
